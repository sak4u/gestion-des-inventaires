// global-setup.js — JavaScript pur (pas de TypeScript) pour éviter les problèmes de transpilation.
// Ce fichier est exécuté UNE SEULE FOIS avant tous les workers Jest.
// Il charge .env.test et synchronise le schéma Prisma avec la base de test,
// puis exécute le seed minimal pour créer rôles + utilisateurs.
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

module.exports = async () => {
  // 1. Synchroniser le schéma (db push fonctionne même si la base contient déjà des tables)
  try {
    execSync('npx prisma db push --accept-data-loss', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env },
      stdio: 'inherit',
    });
    console.log('✓ Schéma synchronisé avec inventaires_test');
  } catch (e) {
    console.log('⚠ Schema sync failed:', e.message);
  }

  // 2. Seed minimal : nettoie les données existantes puis crée rôles + utilisateurs + données de test
  try {
    execSync('npx ts-node prisma/seed-minimal.ts', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env },
      stdio: 'inherit',
    });
    console.log('✓ Seed minimal exécuté');
  } catch (e) {
    console.log('⚠ Seed minimal failed:', e);
  }
};
