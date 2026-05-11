import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

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
}

export class UpdateTableStatusDto {
  @IsEnum(TableStatus, {
    message: 'Status must be AVAILABLE, OCCUPIED, or RESERVED',
  })
  status!: TableStatus;
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
