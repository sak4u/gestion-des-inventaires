const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const propositions = await prisma.propositionCommande.findMany({
    include: {
      produit: true,
      fournisseur: true,
    }
  });
  console.log('Total propositions in DB:', propositions.length);
  console.log(JSON.stringify(propositions, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
