import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAdminToken, getStockToken } from './helpers/auth.helper';

/**
 * Tests E2E — Propositions IA (PropositionCommande)
 * Routes : GET /propositions, POST /propositions/check-all
 * Rôles autorisés : ADMIN, ACHAT
 */
describe('Propositions IA API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let stockToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    adminToken = await getAdminToken(app);
    stockToken = await getStockToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /propositions ─────────────────────────────────────────────────────

  describe('GET /propositions', () => {
    it('doit retourner la liste des propositions', async () => {
      const res = await request(app.getHttpServer())
        .get('/propositions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('doit retourner 401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/propositions')
        .expect(401);
    });
  });

  // ── GET /propositions/pending ─────────────────────────────────────────────

  describe('GET /propositions/pending', () => {
    it('doit retourner les propositions EN_ATTENTE', async () => {
      const res = await request(app.getHttpServer())
        .get('/propositions/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Toutes les propositions retournées doivent être EN_ATTENTE
      res.body.forEach((p: any) => {
        expect(p.statut).toBe('EN_ATTENTE');
      });
    });
  });

  // ── POST /propositions/check-all ──────────────────────────────────────────

  describe('POST /propositions/check-all', () => {
    it('doit déclencher la vérification des stocks bas et retourner un résumé', async () => {
      const res = await request(app.getHttpServer())
        .post('/propositions/check-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('checked');
      expect(res.body).toHaveProperty('propositionsCreated');
      expect(res.body).toHaveProperty('skipped');
      expect(res.body).toHaveProperty('errors');
      expect(typeof res.body.checked).toBe('number');
    }, 60000); // timeout étendu car pipeline IA
  });
});
