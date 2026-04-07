import { IsString, IsOptional } from 'class-validator';

export class GetFournisseursFilterDto {
  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
