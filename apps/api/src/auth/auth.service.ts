import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, prisma, User } from '@repo/db';
import * as bcrypt from 'bcrypt';
import { TokenBlacklistService } from './token-blacklist.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async createUser(
    data: Prisma.UserCreateInput,
  ): Promise<Omit<User, 'password'>> {
    const existedUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existedUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        isActive: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;

    return result;
  }

  async login({ email, password }: Prisma.UserCreateInput): Promise<{
    user: Omit<User, 'password'>;
    accessToken: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId ?? undefined,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...rest } = user;

    return {
      accessToken,
      user: rest,
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

  async validateUser(payload: JwtPayload) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklistService.isBlacklisted(token);
  }
}
