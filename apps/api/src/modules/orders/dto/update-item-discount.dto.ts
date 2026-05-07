import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class UpdateItemDiscountDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'] })
  @IsEnum(['PERCENTAGE', 'FIXED'])
  type!: 'PERCENTAGE' | 'FIXED';
}
