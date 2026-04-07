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
import { CommandeService } from './commande.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('commandes')
export class CommandeController {
  constructor(private readonly commandeService: CommandeService) {}

  @Post()
  create(@Body() createCommandeDto: CreateCommandeDto) {
    return this.commandeService.create(createCommandeDto);
  }

  @Get()
  findAll() {
    return this.commandeService.findAll();
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
