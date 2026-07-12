import { TransferStatus } from '@repo/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTransferDto {
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
