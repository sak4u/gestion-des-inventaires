import { IsString, IsOptional } from 'class-validator';

export class GetSuppliersFilterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
