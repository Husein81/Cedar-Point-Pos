import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@repo/types';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, LoginDto } from './dto/create-user.dto.js';
import { TokenBlacklistService } from './token-blacklist.service.js';

export interface JwtPayload {
  id: string;
  username: string;
  tenantId?: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async createUser(data: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { username, password } = data;
    const existedUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existedUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        isActive: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      username: String(user.username),
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async adminLogin({ username, password }: LoginDto): Promise<{
    user: Omit<User, 'password'>;
    accessToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { username, role: UserRole.ADMIN },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
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

    return {
      accessToken,
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
    user: Omit<User, 'password'>;
    accessToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { tenant: true },
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
      tenantId: user.tenantId ?? undefined,
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
        tenantId: user.tenantId,
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
