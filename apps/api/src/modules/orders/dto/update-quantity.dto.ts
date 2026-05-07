import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdateQuantityDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity!: number;
}
