import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OfferSelectionItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  groupId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  productId!: string;
}

export class AddOfferItemsDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  offerId!: string;

  @ApiProperty({ type: [OfferSelectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferSelectionItemDto)
  selections!: OfferSelectionItemDto[];
}
