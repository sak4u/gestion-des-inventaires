import { IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { EtatCommande, TypeCommande } from '@prisma/client';

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
}
