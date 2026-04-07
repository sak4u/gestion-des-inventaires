import { PartialType } from '@nestjs/mapped-types';
import { CreateFluxDeStockDto } from './create-flux-de-stock.dto';

export class UpdateFluxDeStockDto extends PartialType(CreateFluxDeStockDto) {}
