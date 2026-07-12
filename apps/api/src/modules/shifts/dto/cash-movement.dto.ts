import { CashMovementType } from '@repo/types';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCashMovementDto {
  @IsIn([CashMovementType.CASH_IN, CashMovementType.CASH_OUT])
  type!: typeof CashMovementType.CASH_IN | typeof CashMovementType.CASH_OUT;

  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
