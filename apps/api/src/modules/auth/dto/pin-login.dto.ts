import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

/**
 * POS PIN-login body. Mirrors the shared `PinLoginSchema` in `@repo/types`
 * (kept in sync manually; the frontend still validates against that shared
 * schema). A POS PIN is a 4-6 digit numeric code.
 */
export class PinLoginDto {
  @IsUUID()
  staffId!: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
