import {
  InventoryChangeType,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsAfterField } from '../../common/validators/date-field.validators.js';

/**
 * Expanded Report Query DTO
 * Validates query params for all report endpoints with:
 * - Date range filtering (from/to)
 * - Enum filters (orderType, paymentMethod, status, changeType)
 * - User/branch filtering
 * - Search, sorting, and pagination
 */
export class ReportQueryDto {
  // Date range (required for most report endpoints)
  @Type(() => Date)
  @IsDate()
  from!: Date;

  @Type(() => Date)
  @IsDate()
  @IsAfterField('from', {
    orEqual: true,
    message: 'from date must be before or equal to to date',
  })
  to!: Date;

  // Optional filters
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  // Enum filters
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(InventoryChangeType)
  changeType?: InventoryChangeType;

  // Product filters
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // Search (interpreted differently per endpoint)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  // Sorting (validated per-endpoint in controller/service)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';

  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 25;

  // Limit for dashboard-style endpoints (top products, etc.)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Allowed sort fields per endpoint type
 * Used by service methods to validate sortBy parameter
 */
export const ALLOWED_SORT_FIELDS = {
  salesOrders: [
    'createdAt',
    'completedAt',
    'total',
    'subtotal',
    'discount',
    'orderNumber',
  ],
  paymentTransactions: ['paidAt', 'amount', 'method'],
  inventoryMovements: ['createdAt', 'changeType', 'adjustment'],
  topProducts: ['revenue', 'qtySold', 'productName'],
  loyaltyTransactions: ['createdAt', 'type', 'points', 'direction'],
} as const;

/**
 * Paginated response meta type
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
