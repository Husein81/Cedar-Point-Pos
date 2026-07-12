import { IsString, Matches, MinLength } from 'class-validator';

/**
 * Body for PATCH /staff/:id/set-pin. Mirrors the shared `SetPinSchema`.
 * A POS PIN is a 4-6 digit numeric code, hashed server-side.
 */
export class SetPinDto {
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string;
}

/**
 * Body for PATCH /staff/:id/reset-password. Mirrors the shared
 * `ResetPasswordSchema`; never stored or returned raw.
 */
export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;
}
