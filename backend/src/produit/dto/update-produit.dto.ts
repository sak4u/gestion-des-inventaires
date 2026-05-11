import { IsInt, IsString, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * UpdateProduitDto
 *
 * ⚠️  prixAchatMoyen is intentionally EXCLUDED from this DTO.
 *     It is calculated automatically as CUMP whenever a purchase (ACHAT) commande
 *     is delivered.  Allowing manual updates via the REST API would corrupt the
 *     weighted-average cost calculation.
 *
 *     Only prixVente (the public selling price) is user-editable.
 */
export class UpdateProduitDto {
  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  codeBare?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  stockAlert?: number;

  /** Prix de vente public — set freely by the user. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  prixVente?: number;
}
