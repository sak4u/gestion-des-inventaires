import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RESPONSABLE_STOCK', 'ACHAT')
@Controller('produits')
export class ProduitController {
  constructor(private readonly produitService: ProduitService) {}

  @Post()
  create(@Body() createProduitDto: CreateProduitDto) {
    return this.produitService.create(createProduitDto);
  }

  @Get()
  findAll() {
    return this.produitService.findAll();
  }

  @Get('by-code-barre/lookup')
  findOneByCodeBare(@Query('codeBare') codeBare: string) {
    return this.produitService.findOneByCodeBare(codeBare);
  }

  @Get('by-code-barre/qrcode')
  generateQrCodeFromCodeBare(@Query('codeBare') codeBare: string) {
    return this.produitService.generateQrCodeFromCodeBare(codeBare);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProduitDto: UpdateProduitDto) {
    return this.produitService.update(id, updateProduitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(id);
  }
}
