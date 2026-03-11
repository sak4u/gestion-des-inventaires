import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

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
