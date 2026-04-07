import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCommandeDto {
  @IsString()
  @IsNotEmpty()
  etat!: string;

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  fournisseurId!: string;
}
