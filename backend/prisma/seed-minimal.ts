import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initialisation minimale (Rôles & Admin) ---');

  // Création des rôles
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrateur principal' },
  });
  await prisma.role.upsert({
    where: { name: 'RESPONSABLE_STOCK' },
    update: {},
    create: { name: 'RESPONSABLE_STOCK', description: 'Manager de stock' },
  });
  await prisma.role.upsert({
    where: { name: 'ACHAT' },
    update: {},
    create: { name: 'ACHAT', description: 'Gestionnaire Achat & Fournisseurs' },
  });

  console.log('✔ Rôles initialisés.');

  // Création admin par défaut
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

  console.log('✔ Administrateur créé : admin@email.com / admin123');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
