import { IsNotEmpty, IsOptional, IsUUID, IsEnum, IsArray, ValidateNested, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { EtatCommande, TypeCommande } from '@prisma/client';

class CreateCommandeLigneDto {
  @IsUUID()
  @IsNotEmpty()
  produitId!: string;

  @IsInt()
  @IsNotEmpty()
  quantite!: number;

  @IsNumber()
  @IsOptional()
  prixUnitaire?: number;
}

export class CreateCommandeDto {
  @IsEnum(TypeCommande)
  @IsOptional()
  type?: TypeCommande;

  @IsEnum(EtatCommande)
  @IsOptional()
  etat?: EtatCommande;

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsOptional()
  fournisseurId?: string;

  @IsUUID()
  @IsOptional()
  entrepotId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommandeLigneDto)
  @IsOptional()
  lignes?: CreateCommandeLigneDto[];
}
