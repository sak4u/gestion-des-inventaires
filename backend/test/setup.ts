import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

// Charge .env.test AVANT toute initialisation de module NestJS
// Ceci est nécessaire car Jest ne charge pas les variables d'env automatiquement
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Applique les migrations sur la DB de test avant l'exécution de tous les tests
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (e: any) {
    console.log('Migration already applied or failed:', e.message);
  }
});
