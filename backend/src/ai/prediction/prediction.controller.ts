import {
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PredictionService } from './prediction.service';

import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

/**
 * PredictionController
 *
 * Exposes the AI prediction engine via the /ai/predictions prefix.
 *
 * All routes are protected by JWT authentication.
 *
 * Endpoints:
 *   GET    /ai/predictions                     → list all predictions
 *   GET    /ai/predictions/product/:produitId  → latest for a product
 *   GET    /ai/predictions/:id                 → single by ID
 *   POST   /ai/predictions/:productId          → generate for one product
 *   POST   /ai/predictions/generate-all        → batch generate for all
 *   DELETE /ai/predictions/:id                 → delete a prediction
 *
 * NOTE: Static routes (/product/:produitId, /generate-all) are declared
 * BEFORE dynamic /:id routes to prevent NestJS from incorrectly treating
 * "product" or "generate-all" as an ID parameter.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RESPONSABLE_STOCK') // Only these roles can access predictions
@Controller('ai/predictions')
export class PredictionController {
  private readonly logger = new Logger(PredictionController.name);

  constructor(private readonly predictionService: PredictionService) {}

  // ── List all predictions ────────────────────────────────────────
  @Get()
  findAll() {
    this.logger.debug('GET /ai/predictions');
    return this.predictionService.findAll();
  }

  // ── Get prediction for a specific product ───────────────────────
  // IMPORTANT: must be declared BEFORE /:id to avoid route conflict
  @Get('product/:produitId')
  findByProduct(@Param('produitId') produitId: string) {
    this.logger.debug(`GET /ai/predictions/product/${produitId}`);
    return this.predictionService.findLatestByProduct(produitId);
  }

  // ── Get prediction history for a specific product ────────────────
  @Get('product/:produitId/history')
  findHistoryByProduct(@Param('produitId') produitId: string) {
    this.logger.debug(`GET /ai/predictions/product/${produitId}/history`);
    return this.predictionService.findHistoryByProduct(produitId);
  }

  // ── Batch generate – static route before /:id ──────────────────
  @Post('generate-all')
  generateAll() {
    this.logger.log('POST /ai/predictions/generate-all – batch triggered');
    return this.predictionService.generateAllPredictions();
  }

  // ── Generate prediction for a single product ────────────────────
  @Post(':productId')
  generate(@Param('productId') productId: string) {
    this.logger.log(`POST /ai/predictions/${productId}`);
    return this.predictionService.generatePrediction(productId);
  }

  // ── Get a single prediction by its ID ──────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.debug(`GET /ai/predictions/${id}`);
    return this.predictionService.findOne(id);
  }

  // ── Delete a prediction ─────────────────────────────────────────
  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.log(`DELETE /ai/predictions/${id}`);
    return this.predictionService.remove(id);
  }
}
