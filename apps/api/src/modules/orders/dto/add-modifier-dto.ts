import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddModifierDto {
  @ApiProperty()
  @IsString()
  modifierId!: string;
}
