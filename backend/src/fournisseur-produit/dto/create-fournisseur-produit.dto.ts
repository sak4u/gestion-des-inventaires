import { IsNotEmpty, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class CreateFournisseurProduitDto {
  @IsNumber()
  @IsOptional()
  prixAchat?: number;

  @IsUUID()
  @IsNotEmpty()
  fournisseurId!: string;

  @IsUUID()
  @IsNotEmpty()
  produitId!: string;
}
