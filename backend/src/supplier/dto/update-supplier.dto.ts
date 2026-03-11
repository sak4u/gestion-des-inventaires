import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  phone?: number;

  @IsString()
  @IsOptional()
  address?: string;
}
