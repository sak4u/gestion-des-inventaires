import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

// globalSetup s'exécute UNE SEULE FOIS avant tous les tests (en dehors du contexte Jest worker).
// C'est ici qu'on fait les migrations Prisma.
module.exports = async () => {
  // Charge les variables d'environnement pour globalSetup également
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env },
      stdio: 'inherit',
    });
  } catch (e: any) {
    console.log('Migration already applied or failed:', e.message);
  }
};
