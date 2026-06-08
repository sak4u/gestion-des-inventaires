// global-setup.js — JavaScript pur (pas de TypeScript) pour éviter les problèmes de transpilation.
// Ce fichier est exécuté UNE SEULE FOIS avant tous les workers Jest.
// Il charge .env.test et exécute les migrations Prisma.
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

module.exports = async () => {
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env },
      stdio: 'inherit',
    });
  } catch (e) {
    console.log('Migration already applied or failed:', e.message);
  }
};
