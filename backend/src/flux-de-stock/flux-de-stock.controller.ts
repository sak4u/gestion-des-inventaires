import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FluxDeStockService } from './flux-de-stock.service';
import { CreateFluxDeStockDto } from './dto/create-flux-de-stock.dto';
import { UpdateFluxDeStockDto } from './dto/update-flux-de-stock.dto';
import { CreateTransfertDto } from './dto/create-transfert.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTIONNAIRE_STOCK','ADMINISTRATEUR') 
@Controller('flux-de-stocks')
export class FluxDeStockController {
  constructor(private readonly fluxDeStockService: FluxDeStockService) {}

  @Post()
  create(@Body() createFluxDeStockDto: CreateFluxDeStockDto) {
    return this.fluxDeStockService.create(createFluxDeStockDto);
  }

  // ── Transfert inter-entrepôts (doit être avant :id) ──────────
  @Post('transfert')
  transfert(@Body() dto: CreateTransfertDto) {
    return this.fluxDeStockService.transfert(dto);
  }

  @Get()
  findAll() {
    return this.fluxDeStockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fluxDeStockService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFluxDeStockDto: UpdateFluxDeStockDto,
  ) {
    return this.fluxDeStockService.update(id, updateFluxDeStockDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fluxDeStockService.remove(id);
  }
}
