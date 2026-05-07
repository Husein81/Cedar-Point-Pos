import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser, User, UserRole } from '@repo/types';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, LoginDto } from './dto/create-user.dto.js';
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
      throw new UnauthorizedException('Tenant not found');
    }

    const existedUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existedUser) {
      throw new UnauthorizedException('User already exists');
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

    const hashedPassword = await bcrypt.hash(password, 10);

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
      username: String(user.username),
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
  ): Promise<{
    user: PublicUser;
  }> {
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

    const accessToken = await this.jwtService.signAsync(payload);
    // ✅ Cookie for system-admin web app
    res.cookie('sa_token', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async login({ username, password }: LoginDto): Promise<{
    user: PublicUser;
    accessToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.tenantId) {
      throw new UnauthorizedException('User has no tenant assigned');
    }

    if (!user.tenant) {
      throw new UnauthorizedException('Tenant is deactivated');
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
      tenantId: String(user.tenantId),
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        tenantId: String(user.tenantId),
        tenant: user.tenant,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  logout(token: string): { message: string } {
    // Decode the token to get expiration time
    const decoded: unknown = this.jwtService.decode(token);

    if (
      decoded !== null &&
      typeof decoded === 'object' &&
      'exp' in decoded &&
      typeof (decoded as { exp: unknown }).exp === 'number'
    ) {
      const exp = (decoded as { exp: number }).exp;
      // Calculate TTL (time until token expires)
      const ttl = exp * 1000 - Date.now();

      if (ttl > 0) {
        // Add token to blacklist until it expires
        this.tokenBlacklistService.blacklist(token, ttl);
      }
    }

    return { message: 'Logged out successfully' };
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
