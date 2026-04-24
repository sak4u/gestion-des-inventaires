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
import { EntrepotService } from './entrepot.service';
import { CreateEntrepotDto } from './dto/create-entrepot.dto';
import { UpdateEntrepotDto } from './dto/update-entrepot.dto';
import { GetEntrepotsFilterDto } from './dto/get-entrepots-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATEUR')
@Controller('entrepots')
export class EntrepotController {
  constructor(private readonly entrepotService: EntrepotService) {}

  @Post()
  create(@Body() createEntrepotDto: CreateEntrepotDto) {
    return this.entrepotService.create(createEntrepotDto);
  }

  @Get()
  findAll(@Query() filterDto: GetEntrepotsFilterDto) {
    return this.entrepotService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entrepotService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEntrepotDto: UpdateEntrepotDto,
  ) {
    return this.entrepotService.update(id, updateEntrepotDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entrepotService.remove(id);
  }
}
