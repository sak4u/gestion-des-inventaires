import { PartialType } from '@nestjs/mapped-types';
import { CreatePropositionCommandeDto } from './create-proposition-commande.dto';

export class UpdatePropositionCommandeDto extends PartialType(
  CreatePropositionCommandeDto,
) {}
