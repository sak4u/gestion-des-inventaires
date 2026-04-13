import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PropositionCommandeService } from './proposition-commande.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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

  // ── Get a single proposition by ID ────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propositionService.findOne(id);
  }

  // ── Manually trigger check for all products ───────────────────
  @Post('check-all')
  checkAll() {
    return this.propositionService.checkAllProducts();
  }

  // ── Accept a proposition → creates a real Commande ────────────
  @Post(':id/accept')
  accept(@Param('id') id: string, @Request() req: any) {
    // Extract userId from JWT payload
    const userId = req.user?.id ?? req.user?.sub;
    return this.propositionService.accept(id, userId);
  }

  // ── Reject a proposition ──────────────────────────────────────
  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.propositionService.reject(id);
  }
}
