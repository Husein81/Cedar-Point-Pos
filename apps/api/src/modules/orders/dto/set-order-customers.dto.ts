import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SetOrderCustomersDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Primary customer (earns loyalty), or null to clear the primary.',
  })
  @IsOptional()
  @IsString()
  customerId?: string | null;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Additional customers sharing the order (excludes primary).',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalCustomerIds?: string[];
}
