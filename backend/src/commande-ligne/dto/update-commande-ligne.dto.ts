import { PartialType } from '@nestjs/mapped-types';
import { CreateCommandeLigneDto } from './create-commande-ligne.dto';

export class UpdateCommandeLigneDto extends PartialType(
  CreateCommandeLigneDto,
) {}
