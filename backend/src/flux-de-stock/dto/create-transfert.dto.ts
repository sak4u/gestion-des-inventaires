import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTransfertDto {
  @IsUUID()
  @IsNotEmpty()
  produitId!: string;

  @IsInt()
  @Min(1)
  quantite!: number;

  @IsUUID()
  @IsNotEmpty()
  entrepotSourceId!: string;

  @IsUUID()
  @IsNotEmpty()
  entrepotDestinationId!: string;

  @IsUUID()
  @IsNotEmpty()
  creerParId!: string;

  @IsString()
  @IsOptional()
  note?: string;
}
