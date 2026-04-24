import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StockEntrepotService } from './stock-entrepot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * StockEntrepotController
 *
 * Exposes read-only endpoints to query the localised stock table.
 * All routes are protected by JWT authentication.
 *
 * Routes:
 *   GET  /stock-entrepot                            → All localised stocks
 *   GET  /stock-entrepot/produit/:produitId         → Stock of a product per warehouse
 *   GET  /stock-entrepot/entrepot/:entrepotId       → Products stored in a warehouse
 *   GET  /stock-entrepot/produit/:produitId/entrepot/:entrepotId  → Exact quantity
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTIONNAIRE_STOCK')
@Controller('stock-entrepot')
export class StockEntrepotController {
  constructor(private readonly stockEntrepotService: StockEntrepotService) {}

  /**
   * GET /stock-entrepot
   * Returns all StockEntrepot entries (all products in all warehouses).
   */
  @Get()
  findAll() {
    return this.stockEntrepotService.findAll();
  }

  /**
   * GET /stock-entrepot/produit/:produitId
   * Returns the list of warehouses holding the given product,
   * with the localised quantity in each.
   *
   * Response: { produit, totalGlobal, localisations: [{ entrepot, quantite }] }
   */
  @Get('produit/:produitId')
  findByProduit(@Param('produitId') produitId: string) {
    return this.stockEntrepotService.findByProduit(produitId);
  }

  /**
   * GET /stock-entrepot/entrepot/:entrepotId
   * Returns the list of products stored in the given warehouse,
   * with the localised quantity for each product.
   *
   * Response: { entrepot, produits: [{ produit, quantite }] }
   */
  @Get('entrepot/:entrepotId')
  findByEntrepot(@Param('entrepotId') entrepotId: string) {
    return this.stockEntrepotService.findByEntrepot(entrepotId);
  }

  /**
   * GET /stock-entrepot/produit/:produitId/entrepot/:entrepotId
   * Returns the exact quantity of one product in one specific warehouse.
   */
  @Get('produit/:produitId/entrepot/:entrepotId')
  findOne(
    @Param('produitId') produitId: string,
    @Param('entrepotId') entrepotId: string,
  ) {
    return this.stockEntrepotService.findOne(produitId, entrepotId);
  }
}
