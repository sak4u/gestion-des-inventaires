import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TypeCommande, EtatCommande } from '@prisma/client';
import { CommandeService } from './commande.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ACHAT', 'RESPONSABLE_STOCK')
@Controller('commandes')
export class CommandeController {
  constructor(private readonly commandeService: CommandeService) {}

  @Post()
  create(@Body() createCommandeDto: CreateCommandeDto) {
    return this.commandeService.create(createCommandeDto);
  }

  @Get('enums')
  getEnums() {
    return {
      types: Object.values(TypeCommande),
      etats: Object.values(EtatCommande),
    };
  }

  @Get()
  findAll(@Query('type') type?: string, @Query('etat') etat?: string) {
    return this.commandeService.findAll(
      type as TypeCommande | undefined,
      etat as EtatCommande | undefined,
    );
  }

  @Get('stats')
  @Roles('ADMIN')
  getStats() {
    return this.commandeService.getFinancialStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commandeService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCommandeDto: UpdateCommandeDto,
  ) {
    return this.commandeService.update(id, updateCommandeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commandeService.remove(id);
  }
}
