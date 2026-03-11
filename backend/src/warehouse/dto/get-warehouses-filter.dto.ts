import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetWarehousesFilterDto {
  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;
}
