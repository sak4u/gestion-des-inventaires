import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// UUIDs v4 valides (version=4, variant=8xxx) pour passer @IsUUID() dans les DTOs
const TEST_ENTREPOT_ID    = '00000000-0000-4000-8000-000000000001';
const TEST_FOURNISSEUR_ID = '00000000-0000-4000-8000-000000000002';
const TEST_PRODUIT_ID     = '00000000-0000-4000-8000-000000000003';

async function main() {
  console.log('--- Initialisation minimale (Rôles, Utilisateurs & Données de test) ---');

  // ── 0. Nettoyage des données existantes (ordre inverse des dépendances) ────
  await prisma.propositionCommande.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.fluxDeStock.deleteMany();
  await prisma.commandeLigne.deleteMany();
  await prisma.commande.deleteMany();
  await prisma.stockEntrepot.deleteMany();
  await prisma.fournisseurProduit.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.fournisseur.deleteMany();
  await prisma.entrepot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  console.log('✔ Données de test nettoyées');

  // ── 1. Rôles ────────────────────────────────────────────────────────────────
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrateur principal' },
  });
  const roleRespStock = await prisma.role.upsert({
    where: { name: 'RESPONSABLE_STOCK' },
    update: {},
    create: { name: 'RESPONSABLE_STOCK', description: 'Manager de stock' },
  });
  const roleAchat = await prisma.role.upsert({
    where: { name: 'ACHAT' },
    update: {},
    create: { name: 'ACHAT', description: 'Gestionnaire Achat & Fournisseurs' },
  });
  console.log('✔ Rôles initialisés.');

  // ── 2. Utilisateurs (3 profils pour les tests) ──────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@email.com' },
    update: {},
    create: {
      name: 'Admin Global',
      email: 'admin@email.com',
      password: hashedPassword,
      roleId: roleAdmin.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'manager@email.com' },
    update: {},
    create: {
      name: 'Responsable Stock',
      email: 'manager@email.com',
      password: hashedPassword,
      roleId: roleRespStock.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'achat@email.com' },
    update: {},
    create: {
      name: 'Acheteur User',
      email: 'achat@email.com',
      password: hashedPassword,
      roleId: roleAchat.id,
    },
  });
  console.log('✔ 3 utilisateurs créés : admin / manager / achat');

  // ── 3. Entrepôt (nécessaire pour commande.e2e-spec.ts) ──────────────────────
  // Note : ces UUIDs v4 sont valides (version=4, variant=8) pour @IsUUID()
  await prisma.entrepot.upsert({
    where: { id: TEST_ENTREPOT_ID },
    update: {},
    create: {
      id: TEST_ENTREPOT_ID,
      nom: 'Entrepôt Test E2E',
      adresse: 'Zone Industrielle Test',
      capaciteMax: 5000,
    },
  });
  console.log('✔ 1 entrepôt créé');

  // ── 4. Fournisseur (nécessaire pour commande.e2e-spec.ts) ───────────────────
  await prisma.fournisseur.upsert({
    where: { id: TEST_FOURNISSEUR_ID },
    update: {},
    create: {
      id: TEST_FOURNISSEUR_ID,
      nom: 'Fournisseur Test E2E',
      email: 'fournisseur-test@e2e.com',
      telephone: '+33123456789',
      adresse: 'Lotissement Test',
    },
  });
  console.log('✔ 1 fournisseur créé');

  // ── 5. Produit (nécessaire pour commande avec lignes) ───────────────────────
  const produit = await prisma.produit.upsert({
    where: { id: TEST_PRODUIT_ID },
    update: {},
    create: {
      id: TEST_PRODUIT_ID,
      nom: 'Produit Test E2E',
      codeBare: 'CB-E2E-001',
      category: 'Electronique',
      stockAlert: 10,
      prixAchatMoyen: 29.99,
      prixVente: 49.99,
    },
  });

  // Lier le fournisseur au produit
  await prisma.fournisseurProduit.upsert({
    where: {
      fournisseurId_produitId: {
        fournisseurId: TEST_FOURNISSEUR_ID,
        produitId: produit.id,
      },
    },
    update: {},
    create: {
      fournisseurId: TEST_FOURNISSEUR_ID,
      produitId: produit.id,
      prixAchat: 25.0,
      delaiLivraison: 5,
    },
  });

  // Stock initial dans l'entrepôt
  await prisma.stockEntrepot.upsert({
    where: {
      produitId_entrepotId: {
        produitId: produit.id,
        entrepotId: TEST_ENTREPOT_ID,
      },
    },
    update: {},
    create: {
      produitId: produit.id,
      entrepotId: TEST_ENTREPOT_ID,
      quantite: 100,
    },
  });
  console.log('✔ 1 produit créé avec stock et lien fournisseur');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
