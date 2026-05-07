import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignTableDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tableId?: string;
}
