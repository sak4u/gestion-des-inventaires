import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AiModule } from './ai/ai.module';
import { PropositionCommandeModule } from './proposition-commande/proposition-commande.module';
import { StockSchedulerModule } from './stock-scheduler/stock-scheduler.module';
import { StockEntrepotModule } from './stock-entrepot/stock-entrepot.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    AiModule,
    PropositionCommandeModule,
    StockSchedulerModule,
    StockEntrepotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
