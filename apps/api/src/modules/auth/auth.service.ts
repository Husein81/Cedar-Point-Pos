import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser, User, UserRole } from '@repo/types';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, LoginDto } from './dto/user.dto.js';
import type { AdminLoginDto } from './dto/admin-login.dto.js';
import type { Response } from 'express';
import { TokenBlacklistService } from './token-blacklist.service.js';

export interface JwtPayload {
  id: string;
  username: string;
  tenantId?: string;
  role: UserRole;
}

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

    const payload: JwtPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        tenantId: String(user.tenantId),
        tenant: user.tenant,
      },
    };
  }

  async logout(token: string): Promise<{ message: string }> {
    // Decode the token to get expiration time
    const decoded = this.jwtService.decode(token);

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

  async generateTokens(user: any) {
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
