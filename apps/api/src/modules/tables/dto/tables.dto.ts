import { ApiProperty } from '@nestjs/swagger';
import { TableShape, TableStatus } from '@repo/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @IsPositive({
    message: 'Table number must be a positive integer',
  })
  tableNumber!: number;

  @IsUUID('4', {
    message: 'Invalid branch ID',
  })
  branchId!: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'Invalid floor ID',
  })
  floorId?: string;

  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters',
  })
  name!: string;

  @IsOptional()
  @IsInt()
  @IsPositive({
    message: 'Capacity must be positive',
  })
  capacity: number = 4;

  @IsOptional()
  @IsEnum(TableShape)
  shape?: TableShape;
}

export class UpdateTableDto {
  @IsOptional()
  @IsInt()
  @IsPositive({
    message: 'Table number must be a positive integer',
  })
  tableNumber?: number;

  @IsOptional()
  @IsUUID('4', {
    message: 'Invalid floor ID',
  })
  floorId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters',
  })
  name?: string;

  @IsOptional()
  @IsInt()
  @IsPositive({
    message: 'Capacity must be positive',
  })
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(TableShape)
  shape?: TableShape;
}

export class UpdateTableStatusDto {
  @IsEnum(TableStatus, {
    message: 'Status must be AVAILABLE, OCCUPIED, or RESERVED',
  })
  status!: TableStatus;
}

/** One table's saved floor-plan geometry (world coordinates, px). */
export class TableLayoutItemDto {
  @IsUUID('4', { message: 'Invalid table ID' })
  id!: string;

  @IsNumber()
  posX!: number;

  @IsNumber()
  posY!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(-360)
  @Max(360)
  rotation?: number;

  @IsOptional()
  @IsEnum(TableShape)
  shape?: TableShape;
}

/** Bulk layout save from the Floor Editor. */
export class UpdateTableLayoutDto {
  @ApiProperty({
    type: [TableLayoutItemDto],
    description: 'Array of table layout items to update',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one table layout item is required' })
  @ValidateNested({ each: true })
  @Type(() => TableLayoutItemDto)
  updates!: TableLayoutItemDto[];
}

export class CreateFloorDto {
  @IsUUID('4', {
    message: 'Invalid branch ID',
  })
  branchId!: string;

  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters',
  })
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0, {
    message: 'Order must be non-negative',
  })
  order: number = 0;
}

export class UpdateFloorDto {
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters',
  })
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0, {
    message: 'Order must be non-negative',
  })
  order?: number;
}
