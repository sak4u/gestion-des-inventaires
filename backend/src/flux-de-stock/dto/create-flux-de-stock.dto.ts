import { IsEnum, IsInt, IsNotEmpty, IsUUID } from 'class-validator';
import { TypeStock } from '@prisma/client';

export class CreateFluxDeStockDto {
  @IsInt()
  @IsNotEmpty()
  quantite!: number;

  @IsEnum(TypeStock)
  @IsNotEmpty()
  type!: TypeStock;

  @IsUUID()
  @IsNotEmpty()
  creerParId!: string;

  @IsUUID()
  @IsNotEmpty()
  produitId!: string;

  @IsUUID()
  @IsNotEmpty()
  entrepotId!: string;
}
