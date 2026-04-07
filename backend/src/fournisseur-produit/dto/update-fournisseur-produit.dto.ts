import { PartialType } from '@nestjs/mapped-types';
import { CreateFournisseurProduitDto } from './create-fournisseur-produit.dto';

export class UpdateFournisseurProduitDto extends PartialType(
  CreateFournisseurProduitDto,
) {}
