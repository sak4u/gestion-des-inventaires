import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreatePredictionDto {
  @IsDateString()
  @IsNotEmpty()
  estimationSortieDate!: string;

  @IsInt()
  @IsNotEmpty()
  quantiteRecommande!: number;

  @IsNumber()
  @IsNotEmpty()
  CMJ!: number;

  @IsUUID()
  @IsNotEmpty()
  produitId!: string;
}
