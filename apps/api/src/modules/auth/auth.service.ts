import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser, User, UserRole } from '@repo/types';
import bcrypt from 'bcrypt';
import type { PinLoginInput } from '@repo/types';
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
  /** Present only for POS PIN logins, so `logout()` can close the StaffSession. */
  sessionId?: string;
}

/** POS PIN sessions are short-lived; the terminal re-authenticates per shift. */
const POS_PIN_TOKEN_TTL = '8h';

/**
 * A pre-computed, valid bcrypt hash (cost 12) compared against when a PIN login
 * targets an unknown / PIN-less staff record. Running the same bcrypt work on
 * every path keeps the response time uniform so timing cannot be used to
 * enumerate which staff IDs exist. It never matches a real PIN.
 */
const DUMMY_PIN_HASH =
  '$2b$12$vaFuGQqGzkaKYHTT6a7JVOANjpoLLZdVgFdWbuDmIl44a/Ss2UOy.';

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

    // Always run exactly one bcrypt comparison — against the real hash when
    // present, otherwise a dummy hash — so the response time never reveals
    // whether a staff ID exists or has a PIN set (timing-based enumeration).
    const isPinValid = await bcrypt.compare(
      pin,
      user?.pinHash ?? DUMMY_PIN_HASH,
    );

    // Unknown staff, tenant-less staff, no PIN configured, and a wrong PIN all
    // collapse into one indistinguishable failure.
    if (!user || !user.tenantId || !user.pinHash || !isPinValid) {
      throw new UnauthorizedException({
        message: 'Invalid PIN',
        code: 'INVALID_PIN',
      });
    }

    // Account-status reasons are disclosed only once the PIN is proven correct,
    // so they cannot be probed without valid credentials.
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

    const branchId = await this.resolvePosBranchId(
      user.tenantId,
      user.branchId,
      deviceId,
    );

    // Create the session before signing the token so its id can be embedded in
    // the payload; logout() reads it back to close the session and avoid
    // orphaned "active" rows.
    const session = await this.prisma.staffSession.create({
      data: {
        staffId: user.id,
        tenantId: user.tenantId,
        branchId,
        deviceId: deviceId ?? null,
      },
      select: { id: true },
    });

    const payload: JwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      sessionId: session.id,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: POS_PIN_TOKEN_TTL,
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
   * Resolve which branch a POS session belongs to: prefer the device's branch
   * (validated within the tenant), then fall back to the staff default branch.
   *
   * Only reachable after the PIN has been validated, so the BRANCH_REQUIRED
   * outcome cannot be used to enumerate staff IDs — a wrong PIN never gets here.
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
   * Project a user onto the public shape returned to clients. Built by
   * explicitly picking safe fields (never spread-then-overwrite), so secrets
   * — `password`, `pinHash`, and the bcrypt-hashed `refreshToken` — can never
   * leak even if the Prisma model gains or renames a sensitive column. PIN
   * login issues no refresh token, so it is returned as null.
   */
  private toPublicUser(user: PrismaUser): PublicUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      refreshToken: null,
    };
  }

  async logout(token: string): Promise<{ message: string }> {
    // Decode the token to read the fields we need (decode is generic).
    const decoded = this.jwtService.decode<{
      exp?: number;
      id?: string;
      sessionId?: string;
    }>(token);

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

    // Close the POS PIN session bound to this token (if any) so it does not
    // linger as "active" after the terminal logs out.
    if (decoded?.sessionId) {
      await this.closeStaffSession(decoded.sessionId);
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Idempotently close a POS StaffSession. Uses `updateMany` so a missing or
   * already-closed session never throws — logout must always succeed.
   */
  private async closeStaffSession(sessionId: string): Promise<void> {
    await this.prisma.staffSession.updateMany({
      where: { id: sessionId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });
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
