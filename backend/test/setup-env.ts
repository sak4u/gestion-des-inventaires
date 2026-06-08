import * as dotenv from 'dotenv';
import * as path from 'path';

// IMPORTANT: Ce fichier est chargé via "setupFiles" dans jest-e2e.json
// Il s'exécute AVANT la compilation des modules NestJS, ce qui garantit
// que JWT_SECRET et DATABASE_URL sont disponibles dès l'instantiation de JwtStrategy.
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
