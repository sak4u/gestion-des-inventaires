import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateFournisseurDto {
  @IsString()
  nom!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telephone?: string;

  @IsString()
  @IsOptional()
  adresse?: string;
}
