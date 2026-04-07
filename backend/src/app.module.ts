import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { EntrepotModule } from './entrepot/entrepot.module';
import { FournisseurModule } from './fournisseur/fournisseur.module';
import { ProduitModule } from './produit/produit.module';
import { FournisseurProduitModule } from './fournisseur-produit/fournisseur-produit.module';
import { CommandeModule } from './commande/commande.module';
import { CommandeLigneModule } from './commande-ligne/commande-ligne.module';
import { FluxDeStockModule } from './flux-de-stock/flux-de-stock.module';
import { PredictionModule } from './prediction/prediction.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    EntrepotModule,
    FournisseurModule,
    ProduitModule,
    FournisseurProduitModule,
    CommandeModule,
    CommandeLigneModule,
    FluxDeStockModule,
    PredictionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
