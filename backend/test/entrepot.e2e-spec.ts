import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAdminToken, getAchatToken } from './helpers/auth.helper';
import { cleanTestData } from './helpers/db.helper';

/**
 * Tests E2E — Entrepôts
 * Routes : POST/GET/PATCH/DELETE /entrepots
 * Écriture réservée : ADMIN / RESPONSABLE_STOCK
 */
describe('Entrepots API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let achatToken: string;
  let createdEntrepotId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    adminToken = await getAdminToken(app);
    achatToken = await getAchatToken(app);
  });

  afterAll(async () => {
    if (createdEntrepotId) {
      await cleanTestData({ entrepotIds: [createdEntrepotId] });
    }
    await app.close();
  });

  // ── POST /entrepots ───────────────────────────────────────────────────────

  describe('POST /entrepots', () => {
    it('doit créer un entrepôt (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .post('/entrepots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Entrepôt Test E2E',
          adresse: 'Zone Industrielle Ouest',
          capaciteMax: 1000,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.nom).toBe('Entrepôt Test E2E');
      expect(res.body.capaciteMax).toBe(1000);
      createdEntrepotId = res.body.id;
    });

    it('doit créer un entrepôt sans capaciteMax (optionnel)', async () => {
      const res = await request(app.getHttpServer())
        .post('/entrepots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Entrepôt Sans Capacite' })
        .expect(201);

      expect(res.body.capaciteMax).toBeNull();
      await cleanTestData({ entrepotIds: [res.body.id] });
    });

    it('doit retourner 403 pour le rôle ACHAT (pas autorisé à créer)', async () => {
      await request(app.getHttpServer())
        .post('/entrepots')
        .set('Authorization', `Bearer ${achatToken}`)
        .send({ nom: 'Test Achat' })
        .expect(403);
    });

    it('doit retourner 400 si le nom est manquant', async () => {
      await request(app.getHttpServer())
        .post('/entrepots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adresse: 'Sans nom' })
        .expect(400);
    });
  });

  // ── GET /entrepots ────────────────────────────────────────────────────────

  describe('GET /entrepots', () => {
    it('doit retourner la liste des entrepôts', async () => {
      const res = await request(app.getHttpServer())
        .get('/entrepots')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── GET /entrepots/:id ────────────────────────────────────────────────────

  describe('GET /entrepots/:id', () => {
    it('doit retourner l\'entrepôt par son ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/entrepots/${createdEntrepotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdEntrepotId);
      expect(res.body.nom).toBe('Entrepôt Test E2E');
    });
  });

  // ── PATCH /entrepots/:id ──────────────────────────────────────────────────

  describe('PATCH /entrepots/:id', () => {
    it('doit mettre à jour la capacité maximale', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/entrepots/${createdEntrepotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ capaciteMax: 2500 })
        .expect(200);

      expect(res.body.capaciteMax).toBe(2500);
    });
  });

  // ── DELETE /entrepots/:id ─────────────────────────────────────────────────

  describe('DELETE /entrepots/:id', () => {
    it('doit supprimer l\'entrepôt créé', async () => {
      await request(app.getHttpServer())
        .delete(`/entrepots/${createdEntrepotId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      createdEntrepotId = '';
    });
  });
});
