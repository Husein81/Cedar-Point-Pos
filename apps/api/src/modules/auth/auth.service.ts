import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser, User, UserRole } from '@repo/types';
import bcrypt from 'bcrypt';
import type { PinLoginInput } from '@repo/types';
import { assertCanManageRole } from '../common/role-authorization.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, LoginDto } from './dto/user.dto.js';
import type { AdminLoginDto } from './dto/admin-login.dto.js';
import type { User as PrismaUser } from '../../generated/prisma/client.js';
import type { Response } from 'express';
import { TokenBlacklistService } from './token-blacklist.service.js';

export interface JwtPayload {
  id: string;
  username: string;
  tenantId?: string;
  role: UserRole;
}

/** POS PIN sessions are short-lived; the terminal re-authenticates per shift. */
const POS_PIN_TOKEN_TTL = '8h';
/** Cost factor for hashing PINs at rest (matches password hashing). */
const PIN_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async createUser(data: CreateUserDto): Promise<PublicUser> {
    const { username, password, tenantId, role } = data;

    // Validate tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new UnauthorizedException('Registration failed');
    }

    const existedUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existedUser) {
      throw new UnauthorizedException('Registration failed');
    }

    // If creating a non-admin user, ensure tenant has at least one admin
    if (role !== UserRole.ADMIN) {
      const tenantAdmin = await this.prisma.user.findFirst({
        where: {
          tenantId,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      if (!tenantAdmin) {
        throw new UnauthorizedException(
          'Cannot create non-admin users. Tenant must have at least one active admin first',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Failed to create user');
    }

    return {
      id: user.id,
      name: user.name,
      refreshToken: String(user.refreshToken),
      username: String(user.username),
      email: user.email,
      role: user.role,
      tenantId: String(user.tenantId),
      isActive: user.isActive,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async adminLogin(
    { email, password }: AdminLoginDto,
    res: Response,
  ): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { email, role: UserRole.SYSTEM_ADMIN },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      String(user.password),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, refreshToken);

    // ✅ Cookie for system-admin web app
    res.cookie('sa_token', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    });

    res.cookie('sa_refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      refreshToken,
      role: user.role,
      isActive: true,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async login({ username, password }: LoginDto): Promise<{
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { tenant: true },
    });

    if (!user || !user.tenantId || !user.tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      String(user.password),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        refreshToken,
        role: user.role,
        isActive: true,
        phone: user.phone ?? null,
        avatar: user.avatar ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        tenantId: String(user.tenantId),
        tenant: user.tenant,
      },
    };
  }

  /**
   * Authenticate a staff member on a POS terminal using their numeric PIN.
   *
   * The tenant is derived from the staff record (never accepted from the
   * client). Returns a short-lived access token plus the id of the freshly
   * created StaffSession so the terminal can close it on shift switch.
   */
  async pinLogin(input: PinLoginInput): Promise<{
    user: PublicUser;
    accessToken: string;
    sessionId: string;
  }> {
    const { staffId, pin, deviceId } = input;

    const user = await this.prisma.user.findUnique({ where: { id: staffId } });

    // Generic failure for unknown / tenant-less staff to avoid enumeration.
    if (!user || !user.tenantId) {
      throw new UnauthorizedException({
        message: 'Invalid PIN',
        code: 'INVALID_PIN',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'Account is deactivated',
        code: 'STAFF_INACTIVE',
      });
    }

    if (!user.hasPosAccess) {
      throw new ForbiddenException({
        message: 'POS access is disabled for this account',
        code: 'POS_ACCESS_DENIED',
      });
    }

    if (!user.pinHash) {
      throw new UnauthorizedException({
        message: 'PIN not set',
        code: 'PIN_NOT_SET',
      });
    }

    const isPinValid = await bcrypt.compare(pin, user.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException({
        message: 'Invalid PIN',
        code: 'INVALID_PIN',
      });
    }

    const branchId = await this.resolvePosBranchId(
      user.tenantId,
      user.branchId,
      deviceId,
    );

    const payload: JwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: POS_PIN_TOKEN_TTL,
    });

    const session = await this.prisma.staffSession.create({
      data: {
        staffId: user.id,
        tenantId: user.tenantId,
        branchId,
        deviceId: deviceId ?? null,
      },
      select: { id: true },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.toPublicUser(user),
      accessToken,
      sessionId: session.id,
    };
  }

  /**
   * Set or reset a staff member's POS PIN. Scoped to the caller's tenant, and
   * gated by the role hierarchy so a manager cannot set a PIN on an admin
   * account (which would let them PIN-login with admin privileges).
   */
  async setPin(
    tenantId: string,
    actorRole: UserRole,
    userId: string,
    pin: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Staff member not found');
    }

    assertCanManageRole(actorRole, user.role);

    const pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });

    return { message: 'PIN updated successfully' };
  }

  /**
   * Resolve which branch a POS session belongs to: prefer the device's branch
   * (validated within the tenant), then fall back to the staff default branch.
   */
  private async resolvePosBranchId(
    tenantId: string,
    defaultBranchId: string | null,
    deviceId?: string,
  ): Promise<string> {
    if (deviceId) {
      const device = await this.prisma.pOSDevice.findFirst({
        where: { id: deviceId, tenantId },
        select: { branchId: true },
      });
      if (device) {
        return device.branchId;
      }
    }

    if (defaultBranchId) {
      return defaultBranchId;
    }

    throw new BadRequestException({
      message: 'No branch could be resolved for this PIN login',
      code: 'BRANCH_REQUIRED',
    });
  }

  /**
   * Strip secrets before returning a user to any client. The stored
   * `refreshToken` is a bcrypt hash and must never be exposed; PIN login does
   * not issue a refresh token, so it is nulled out.
   */
  private toPublicUser(user: PrismaUser): PublicUser {
    const {
      password: _password,
      pinHash: _pinHash,
      refreshToken: _refreshToken,
      ...rest
    } = user;
    void _password;
    void _pinHash;
    void _refreshToken;
    return { ...rest, refreshToken: null };
  }

  async logout(token: string): Promise<{ message: string }> {
    // Decode the token to read the fields we need (decode is generic).
    const decoded = this.jwtService.decode<{ exp?: number; id?: string }>(
      token,
    );

    if (decoded?.exp) {
      const timeTokenExpiresIn = decoded.exp * 1000 - Date.now();
      if (timeTokenExpiresIn > 0) {
        this.tokenBlacklistService.blacklist(token, timeTokenExpiresIn);
      }
    }

    if (decoded?.id) {
      await this.prisma.user.update({
        where: { id: decoded.id },
        data: { refreshToken: null },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async generateTokens(user: User) {
    const payload: JwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      ...(user.tenantId && { tenantId: String(user.tenantId) }),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '24h',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRT = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRT },
    });
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken || !user.isActive) {
      throw new UnauthorizedException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(rt, user.refreshToken);
    if (!rtMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = (await this.prisma.user.findUnique({
      where: { id: payload.id },
    })) as User;

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklistService.isBlacklisted(token);
  }
}
