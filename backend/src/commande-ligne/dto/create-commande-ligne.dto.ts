import {
  IsInt,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateCommandeLigneDto {
  @IsInt()
  @IsNotEmpty()
  quantite!: number;

  @IsNumber()
  @IsOptional()
  prixUnitaire?: number;

  @IsUUID()
  @IsNotEmpty()
  commandeId!: string;

  @IsUUID()
  @IsNotEmpty()
  produitId!: string;
}
