import { execSync } from 'child_process';

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
