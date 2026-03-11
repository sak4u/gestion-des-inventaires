import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;
}
