import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StatutProposition } from '@prisma/client';
import { PropositionCommandeService } from './proposition-commande.service';
import { AcceptPropositionDto } from './dto/accept-proposition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ACHAT')
@Controller('propositions')
export class PropositionCommandeController {
  constructor(
    private readonly propositionService: PropositionCommandeService,
  ) {}

  // ── Enum values (dynamic) ─────────────────────────────────────
  @Get('enums')
  getEnums() {
    return {
      statuts: Object.values(StatutProposition),
    };
  }

  // ── List all propositions ─────────────────────────────────────
  @Get()
  findAll(
    @Query('statut') statut?: string,
    @Query('search') search?: string,
    @Query('produitId') produitId?: string,
    @Query('fournisseurId') fournisseurId?: string,
    @Query('commandeEtat') commandeEtat?: string,
  ) {
    return this.propositionService.findAll({
      statut: statut as StatutProposition | undefined,
      search,
      produitId,
      fournisseurId,
      commandeEtat: commandeEtat as any,
    });
  }

  // ── List only pending propositions ────────────────────────────
  @Get('pending')
  findPending() {
    return this.propositionService.findPending();
  }

  // ── Manually trigger check for all products ───────────────────
  @Post('check-all')
  @HttpCode(HttpStatus.OK)
  checkAll() {
    return this.propositionService.checkAllProducts();
  }

  // ── Get a single proposition by ID ────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propositionService.findOne(id);
  }

  // ── Accept a proposition → choisir l'entrepôt de réception ───
  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptPropositionDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    return this.propositionService.accept(id, userId, dto.entrepotId);
  }

  // ── Reject a proposition ──────────────────────────────────────
  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.propositionService.reject(id);
  }
}
