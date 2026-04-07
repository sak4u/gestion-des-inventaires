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

@UseGuards(JwtAuthGuard)
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
