import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEntrepotDto {
  @IsString()
  nom!: string;

  @IsString()
  @IsOptional()
  adresse?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capaciteMax?: number;
}
