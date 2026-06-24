-- CreateEnum
CREATE TYPE "TypeStock" AS ENUM ('achat', 'vente', 'perte', 'retour', 'correction_inventaire', 'transfert');

-- CreateEnum
CREATE TYPE "EtatCommande" AS ENUM ('EN_COURS', 'FERMEE', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeCommande" AS ENUM ('ACHAT', 'VENTE');

-- CreateEnum
CREATE TYPE "StatutProposition" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT NOT NULL,
    "resetCode" TEXT,
    "resetExpires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrepot" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "capaciteMax" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrepot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "codeBare" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stockAlert" INTEGER NOT NULL,
    "prixAchatMoyen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixVente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FournisseurProduit" (
    "id" TEXT NOT NULL,
    "prixAchat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delaiLivraison" INTEGER NOT NULL DEFAULT 5,
    "fournisseurId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FournisseurProduit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "type" "TypeCommande" NOT NULL DEFAULT 'ACHAT',
    "etat" "EtatCommande" NOT NULL DEFAULT 'EN_COURS',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "fournisseurId" TEXT,
    "entrepotId" TEXT,
    "propositionId" TEXT,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeLigne" (
    "id" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commandeId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FluxDeStock" (
    "id" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "type" "TypeStock" NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creerParId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "entrepotId" TEXT NOT NULL,
    "entrepotLieId" TEXT,
    "commandeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FluxDeStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "estimationSortieDate" TIMESTAMP(3) NOT NULL,
    "quantiteRecommande" INTEGER NOT NULL,
    "CMJ" DOUBLE PRECISION NOT NULL,
    "methode" TEXT NOT NULL DEFAULT 'hybrid',
    "fiabilite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "explication" TEXT NOT NULL DEFAULT '',
    "tendance" TEXT NOT NULL DEFAULT 'stable',
    "produitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropositionCommande" (
    "id" TEXT NOT NULL,
    "quantiteProposee" INTEGER NOT NULL,
    "dateProposition" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutProposition" NOT NULL DEFAULT 'EN_ATTENTE',
    "scoreFournisseur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "produitId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropositionCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEntrepot" (
    "id" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "produitId" TEXT NOT NULL,
    "entrepotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockEntrepot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Fournisseur_email_key" ON "Fournisseur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_codeBare_key" ON "Produit"("codeBare");

-- CreateIndex
CREATE UNIQUE INDEX "FournisseurProduit_fournisseurId_produitId_key" ON "FournisseurProduit"("fournisseurId", "produitId");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_propositionId_key" ON "Commande"("propositionId");

-- CreateIndex
CREATE INDEX "Commande_fournisseurId_idx" ON "Commande"("fournisseurId");

-- CreateIndex
CREATE INDEX "Commande_userId_idx" ON "Commande"("userId");

-- CreateIndex
CREATE INDEX "Commande_type_idx" ON "Commande"("type");

-- CreateIndex
CREATE INDEX "CommandeLigne_commandeId_idx" ON "CommandeLigne"("commandeId");

-- CreateIndex
CREATE INDEX "CommandeLigne_produitId_idx" ON "CommandeLigne"("produitId");

-- CreateIndex
CREATE INDEX "FluxDeStock_produitId_date_idx" ON "FluxDeStock"("produitId", "date");

-- CreateIndex
CREATE INDEX "FluxDeStock_entrepotId_idx" ON "FluxDeStock"("entrepotId");

-- CreateIndex
CREATE INDEX "FluxDeStock_type_idx" ON "FluxDeStock"("type");

-- CreateIndex
CREATE INDEX "Prediction_produitId_createdAt_idx" ON "Prediction"("produitId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PropositionCommande_produitId_idx" ON "PropositionCommande"("produitId");

-- CreateIndex
CREATE INDEX "PropositionCommande_statut_idx" ON "PropositionCommande"("statut");

-- CreateIndex
CREATE INDEX "StockEntrepot_produitId_idx" ON "StockEntrepot"("produitId");

-- CreateIndex
CREATE INDEX "StockEntrepot_entrepotId_idx" ON "StockEntrepot"("entrepotId");

-- CreateIndex
CREATE UNIQUE INDEX "StockEntrepot_produitId_entrepotId_key" ON "StockEntrepot"("produitId", "entrepotId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FournisseurProduit" ADD CONSTRAINT "FournisseurProduit_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FournisseurProduit" ADD CONSTRAINT "FournisseurProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_entrepotId_fkey" FOREIGN KEY ("entrepotId") REFERENCES "Entrepot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeLigne" ADD CONSTRAINT "CommandeLigne_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeLigne" ADD CONSTRAINT "CommandeLigne_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FluxDeStock" ADD CONSTRAINT "FluxDeStock_creerParId_fkey" FOREIGN KEY ("creerParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FluxDeStock" ADD CONSTRAINT "FluxDeStock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FluxDeStock" ADD CONSTRAINT "FluxDeStock_entrepotId_fkey" FOREIGN KEY ("entrepotId") REFERENCES "Entrepot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FluxDeStock" ADD CONSTRAINT "FluxDeStock_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionCommande" ADD CONSTRAINT "PropositionCommande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionCommande" ADD CONSTRAINT "PropositionCommande_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionCommande" ADD CONSTRAINT "PropositionCommande_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntrepot" ADD CONSTRAINT "StockEntrepot_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntrepot" ADD CONSTRAINT "StockEntrepot_entrepotId_fkey" FOREIGN KEY ("entrepotId") REFERENCES "Entrepot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

