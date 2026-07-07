import {IsInt,IsNotEmpty,IsString,IsNumber,IsOptional,Min,} from 'class-validator';

export class CreateProduitDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsString()
  @IsNotEmpty()
  codeBare!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  stockAlert!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  prixAchatMoyen?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  prixVente?: number;
}
