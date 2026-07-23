import { User, UserRole } from '@repo/types';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @IsString()
  @MinLength(1)
  tenantCode!: string;

  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class LoginResponse {
  user!: User;
  accessToken!: string;
  refreshToken!: string;
}
