import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PropositionCommandeService } from './proposition-commande.service';
import { AcceptPropositionDto } from './dto/accept-proposition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RESPONSABLE_STOCK', 'ACHAT')
@Controller('propositions')
export class PropositionCommandeController {
  constructor(
    private readonly propositionService: PropositionCommandeService,
  ) {}

  // ── List all propositions ─────────────────────────────────────
  @Get()
  findAll() {
    return this.propositionService.findAll();
  }

  // ── List only pending propositions ────────────────────────────
  @Get('pending')
  findPending() {
    return this.propositionService.findPending();
  }

  // ── Manually trigger check for all products ───────────────────
  @Post('check-all')
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
