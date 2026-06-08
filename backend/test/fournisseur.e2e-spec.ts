import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAdminToken } from './helpers/auth.helper';
import { cleanTestData } from './helpers/db.helper';

/**
 * Tests E2E — Fournisseurs
 * Routes : POST/GET/PATCH/DELETE /fournisseurs
 */
describe('Fournisseurs API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdFournisseurId: string;

  const testEmail = `fournisseur-e2e-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    if (createdFournisseurId) {
      await cleanTestData({ fournisseurIds: [createdFournisseurId] });
    }
    await app.close();
  });

  // ── POST /fournisseurs ────────────────────────────────────────────────────

  describe('POST /fournisseurs', () => {
    it('doit créer un fournisseur avec les champs valides', async () => {
      const res = await request(app.getHttpServer())
        .post('/fournisseurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Fournisseur Test E2E',
          email: testEmail,
          telephone: '+33600000001',
          adresse: 'Zone Industrielle Test',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.nom).toBe('Fournisseur Test E2E');
      expect(res.body.email).toBe(testEmail);
      createdFournisseurId = res.body.id;
    });

    it('doit créer un fournisseur sans email (champ optionnel)', async () => {
      const res = await request(app.getHttpServer())
        .post('/fournisseurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Fournisseur Sans Email' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      // nettoyage immédiat
      await cleanTestData({ fournisseurIds: [res.body.id] });
    });

    it('doit retourner 401 sans token', async () => {
      await request(app.getHttpServer())
        .post('/fournisseurs')
        .send({ nom: 'Test' })
        .expect(401);
    });

    it('doit retourner 400 avec un email invalide', async () => {
      await request(app.getHttpServer())
        .post('/fournisseurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Test', email: 'pas-un-email' })
        .expect(400);
    });
  });

  // ── GET /fournisseurs ─────────────────────────────────────────────────────

  describe('GET /fournisseurs', () => {
    it('doit retourner la liste des fournisseurs', async () => {
      const res = await request(app.getHttpServer())
        .get('/fournisseurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── GET /fournisseurs/:id ─────────────────────────────────────────────────

  describe('GET /fournisseurs/:id', () => {
    it('doit retourner le fournisseur par son ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/fournisseurs/${createdFournisseurId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdFournisseurId);
    });

    it('doit retourner 404 pour un ID inexistant', async () => {
      await request(app.getHttpServer())
        .get('/fournisseurs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── PATCH /fournisseurs/:id ───────────────────────────────────────────────

  describe('PATCH /fournisseurs/:id', () => {
    it('doit mettre à jour le numéro de téléphone', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/fournisseurs/${createdFournisseurId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ telephone: '+33700000099' })
        .expect(200);

      expect(res.body.telephone).toBe('+33700000099');
    });
  });

  // ── DELETE /fournisseurs/:id ──────────────────────────────────────────────

  describe('DELETE /fournisseurs/:id', () => {
    it('doit supprimer le fournisseur créé', async () => {
      await request(app.getHttpServer())
        .delete(`/fournisseurs/${createdFournisseurId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      createdFournisseurId = '';
    });
  });
});
