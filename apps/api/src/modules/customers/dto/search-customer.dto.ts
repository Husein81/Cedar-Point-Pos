import { Min, Max, IsNumber, IsString } from 'class-validator';

export class SearchCustomerDto {
  @IsString()
  query?: string;
  @IsNumber()
  @Min(1)
  @Max(50)
  limit!: number;
}
