import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class OpenShiftDto {
  @IsString()
  @MinLength(1, { message: 'Branch ID is required' })
  branchId!: string;

  @IsString()
  @MinLength(1, { message: 'Device ID is required' })
  deviceId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Starting cash must be >= 0' })
  startCash: number = 0;

  @IsOptional()
  @IsString()
  @MinLength(1)
  scheduleId?: string;
}
