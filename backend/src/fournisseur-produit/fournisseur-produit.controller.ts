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
import { FournisseurProduitService } from './fournisseur-produit.service';
import { CreateFournisseurProduitDto } from './dto/create-fournisseur-produit.dto';
import { UpdateFournisseurProduitDto } from './dto/update-fournisseur-produit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RESPONSABLE_STOCK', 'ACHAT') // Les responsables de stock et les acheteurs peuvent gérer les associations fournisseur-produit
@Controller('fournisseur-produits')
export class FournisseurProduitController {
  constructor(
    private readonly fournisseurProduitService: FournisseurProduitService,
  ) {}

  @Post()
  create(@Body() createFournisseurProduitDto: CreateFournisseurProduitDto) {
    return this.fournisseurProduitService.create(createFournisseurProduitDto);
  }

  @Get()
  findAll() {
    return this.fournisseurProduitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fournisseurProduitService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFournisseurProduitDto: UpdateFournisseurProduitDto,
  ) {
    return this.fournisseurProduitService.update(
      id,
      updateFournisseurProduitDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fournisseurProduitService.remove(id);
  }
}
