import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FournisseurService } from './fournisseur.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { GetFournisseursFilterDto } from './dto/get-fournisseurs-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RESPONSABLE_STOCK', 'ACHAT') // Les responsables de stock et les acheteurs peuvent gérer les fournisseurs
@Controller('fournisseurs')
export class FournisseurController {
  constructor(private readonly fournisseurService: FournisseurService) {}

  @Post()
  create(@Body() createFournisseurDto: CreateFournisseurDto) {
    return this.fournisseurService.create(createFournisseurDto);
  }

  @Get()
  findAll(@Query() filterDto: GetFournisseursFilterDto) {
    return this.fournisseurService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fournisseurService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFournisseurDto: UpdateFournisseurDto,
  ) {
    return this.fournisseurService.update(id, updateFournisseurDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fournisseurService.remove(id);
  }
}
