import { IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { EtatCommande } from '@prisma/client';

export class CreateCommandeDto {
  @IsEnum(EtatCommande)
  @IsOptional()
  etat?: EtatCommande;

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  fournisseurId!: string;

  @IsUUID()
  @IsOptional()
  entrepotId?: string;
}
