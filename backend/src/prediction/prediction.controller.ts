import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  // ── List all predictions (most recent first) ──────────────────
  @Get()
  findAll() {
    return this.predictionService.findAll();
  }

  // ── Get the latest prediction for a specific product ──────────
  // IMPORTANT: This route MUST be declared BEFORE ':id' to prevent
  // NestJS from matching "product" as an ID parameter.
  @Get('product/:produitId')
  findByProduct(@Param('produitId') produitId: string) {
    return this.predictionService.findLatestByProduct(produitId);
  }

  // ── Get a single prediction by ID ─────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.predictionService.findOne(id);
  }

  // ── Generate a prediction for one product ─────────────────────
  @Post('generate/:produitId')
  generate(@Param('produitId') produitId: string) {
    return this.predictionService.generatePrediction(produitId);
  }

  // ── Generate predictions for ALL products (batch) ─────────────
  @Post('generate-all')
  generateAll() {
    return this.predictionService.generateAllPredictions();
  }

  // ── Delete a prediction ───────────────────────────────────────
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.predictionService.remove(id);
  }
}
