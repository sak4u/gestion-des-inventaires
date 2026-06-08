import { PrismaClient, EtatCommande } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Démarrage de la réinitialisation de la base de données ---');

  // Vider les tables dans l'ordre inverse des relations pour éviter les erreurs de clés étrangères
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

  console.log('✔ Base de données vidée.');

  // Création des rôles
  const roleAdmin = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Administrateur principal' },
  });
  const roleRespStock = await prisma.role.create({
    data: { name: 'RESPONSABLE_STOCK', description: 'Manager de stock' },
  });
  const roleAchat = await prisma.role.create({
    data: { name: 'ACHAT', description: 'Gestionnaire Achat & Fournisseurs' },
  });

  console.log('✔ Rôles créés.');

  // Création des utilisateurs
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@email.com',
      password: hashedPassword,
      roleId: roleAdmin.id,
    },
  });

  const responsable = await prisma.user.create({
    data: {
      name: 'Responsable Stock',
      email: 'manager@email.com',
      password: hashedPassword,
      roleId: roleRespStock.id,
    },
  });

  const acheteur = await prisma.user.create({
    data: {
      name: 'Acheteur User',
      email: 'achat@email.com',
      password: hashedPassword,
      roleId: roleAchat.id,
    },
  });

  console.log('✔ Utilisateurs (Credentials) créés.');

  // Création d'entrepôts (sans stockActuelle — supprimé du schema)
  const entrepots: any[] = [];
  for(let i=1; i<=3; i++) {
    entrepots.push(await prisma.entrepot.create({
      data: {
        nom: `Entrepôt Principal ${i}`,
        adresse: `Zone Industrielle, Bâtiment ${i}`,
        capaciteMax: 5000 * i,
      }
    }));
  }
  console.log('✔ Entrepôts créés.');

  // Création de fournisseurs (3 à 5)
  const fournisseurs: any[] = [];
  for(let i=1; i<=4; i++) {
    fournisseurs.push(await prisma.fournisseur.create({
      data: {
        nom: `Fournisseur Tech Pro ${i}`,
        email: `contact@fournisseur${i}.com`,
        telephone: `+3312345678${i}`,
        adresse: `Lotissement Industriel ${i}`
      }
    }));
  }
  console.log('✔ Fournisseurs créés.');

  // Création de 15 produits et liens fournisseurs
  const produits: any[] = [];
  const categories = ['Electronique', 'Informatique', 'Réseau', 'Câblage'];
  for (let i = 1; i <= 15; i++) {
    const produit = await prisma.produit.create({
      data: {
        nom: `Produit Test ${i} (Composant)`,
        codeBare: `PRD-${Date.now()}-${i}`,
        category: categories[i % categories.length],
        stockAlert: 40 + (i * 2),
        prixAchatMoyen: 50.0 + (i * 1.5),
        prixVente: 70.0 + (i * 2.0),
      }
    });
    produits.push(produit);

    // Lier fournisseurs au produit
    await prisma.fournisseurProduit.create({
      data: {
        produitId: produit.id,
        fournisseurId: fournisseurs[i % fournisseurs.length].id,
        prixAchat: 40.0 + i,
        delaiLivraison: 3 + (i % 3)
      }
    });
  }
  console.log('✔ 15 Produits et liaisons Fournisseurs créés.');

  function entrepotIndex(i: number) {
      return i % entrepots.length;
  }

  // Création Flux de Stocks, StockEntrepot ET commandes
  console.log('Génération de l\'historique des Flux de stocks, Stocks Locaux et Commandes...');
  
  const getRandomDatePast90Days = () => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 90));
    return date;
  };

  let fluxCount = 0;
  for (const produit of produits) {
    const quantiteAchatInitiale = 60;
    
    // Suivi par entrepôt
    const stockParEntrepot = new Map<string, number>();
    for (const e of entrepots) {
      stockParEntrepot.set(e.id, 0);
    }

    // 1. Simulation d'un stock d'achat initial
    await prisma.fluxDeStock.create({
        data: {
            quantite: quantiteAchatInitiale,
            type: 'achat',
            note: 'Stock initial',
            date: new Date(new Date().setDate(new Date().getDate() - 90)),
            produitId: produit.id,
            entrepotId: entrepots[0].id,
            creerParId: responsable.id,
        }
    });
    
    stockParEntrepot.set(entrepots[0].id, quantiteAchatInitiale);
    fluxCount++;
    
    // 2. Quelques ventes réparties pour faire baisser le stock SOUS la barre d'alerte
    for (let i = 0; i < 4; i++) {
        const typeStock = Math.random() > 0.8 ? 'perte' : 'vente'; 
        const qtyVente = Math.floor(Math.random() * 5) + 8;
        const eId = entrepots[entrepotIndex(i)].id;

        stockParEntrepot.set(eId, (stockParEntrepot.get(eId) || 0) - qtyVente);

        await prisma.fluxDeStock.create({
            data: {
                quantite: qtyVente,
                type: typeStock as any,
                date: getRandomDatePast90Days(),
                produitId: produit.id,
                entrepotId: eId,
                creerParId: responsable.id,
            }
        });
        fluxCount++;
    }

    // 3. Mise à jour de StockEntrepot pour tous les entrepôts
    for (const [eId, qte] of stockParEntrepot.entries()) {
      await prisma.stockEntrepot.upsert({
        where: {
          produitId_entrepotId: {
            produitId: produit.id,
            entrepotId: eId
          }
        },
        create: {
          produitId: produit.id,
          entrepotId: eId,
          quantite: qte
        },
        update: {
          quantite: qte
        }
      });
    }
  }

  // 5. Création de quelques Commandes (historique achats) — utilise l'enum EtatCommande
  for (let i = 0; i < 3; i++) {
    const supplier = fournisseurs[i % fournisseurs.length];
    const commande = await prisma.commande.create({
      data: {
        etat: EtatCommande.LIVREE,
        userId: responsable.id,
        fournisseurId: supplier.id,
        entrepotId: entrepots[i % entrepots.length].id,
      }
    });
    
    // Ajouter 2 lignes par commande
    for (let j = 0; j < 2; j++) {
      const prod = produits[(i + j) % produits.length];
      await prisma.commandeLigne.create({
        data: {
          commandeId: commande.id,
          produitId: prod.id,
          quantite: 20,
          prixUnitaire: prod.prixAchatMoyen * 0.8
        }
      });
    }
  }
  
  console.log(`✔ ${fluxCount} Flux de stocks créés.`);
  console.log(`✔ Stocks par Entrepôt créés.`);
  console.log(`✔ Commandes et Lignes de commandes ajoutées.`);

  console.log('--- Remplissage terminé avec succès ! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
