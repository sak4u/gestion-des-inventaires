import { Module } from '@nestjs/common';
import { FournisseurProduitService } from './fournisseur-produit.service';
import { FournisseurProduitController } from './fournisseur-produit.controller';

@Module({
  controllers: [FournisseurProduitController],
  providers: [FournisseurProduitService],
  exports: [FournisseurProduitService],
})
export class FournisseurProduitModule {}
