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
import { CommandeLigneService } from './commande-ligne.service';
import { CreateCommandeLigneDto } from './dto/create-commande-ligne.dto';
import { UpdateCommandeLigneDto } from './dto/update-commande-ligne.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('commande-lignes')
export class CommandeLigneController {
  constructor(private readonly commandeLigneService: CommandeLigneService) {}

  @Post()
  create(@Body() createCommandeLigneDto: CreateCommandeLigneDto) {
    return this.commandeLigneService.create(createCommandeLigneDto);
  }

  @Get()
  findAll() {
    return this.commandeLigneService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commandeLigneService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCommandeLigneDto: UpdateCommandeLigneDto,
  ) {
    return this.commandeLigneService.update(id, updateCommandeLigneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commandeLigneService.remove(id);
  }
}
