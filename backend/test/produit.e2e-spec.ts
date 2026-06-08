import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAdminToken } from './helpers/auth.helper';
import { cleanTestData } from './helpers/db.helper';

/**
 * Tests E2E — Produits
 * Routes : POST/GET/PATCH/DELETE /produits
 * Champs obligatoires : nom, codeBare, category, stockAlert
 */
describe('Produits API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdProduitId: string;

  // codeBare unique pour éviter les conflits entre runs
  const testCodeBare = `TEST-E2E-${Date.now()}`;

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
    if (createdProduitId) {
      await cleanTestData({ produitIds: [createdProduitId] });
    }
    await app.close();
  });

  // ── POST /produits ────────────────────────────────────────────────────────

  describe('POST /produits', () => {
    it('doit créer un produit avec les champs obligatoires', async () => {
      const res = await request(app.getHttpServer())
        .post('/produits')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Produit Test E2E',
          codeBare: testCodeBare,
          category: 'Electronique',
          stockAlert: 10,
          prixAchatMoyen: 29.99,
          prixVente: 49.99,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.nom).toBe('Produit Test E2E');
      expect(res.body.codeBare).toBe(testCodeBare);
      expect(res.body.stockAlert).toBe(10);
      createdProduitId = res.body.id;
    });

    it('doit retourner 401 sans token', async () => {
      await request(app.getHttpServer())
        .post('/produits')
        .send({ nom: 'Test', codeBare: 'CB-NOAUTH', category: 'Test', stockAlert: 5 })
        .expect(401);
    });

    it('doit retourner 400 si codeBare est manquant', async () => {
      await request(app.getHttpServer())
        .post('/produits')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Produit Sans CodeBare', category: 'Test', stockAlert: 5 })
        .expect(400);
    });

    it('doit retourner 400 si nom est manquant', async () => {
      await request(app.getHttpServer())
        .post('/produits')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ codeBare: 'CB-NONOM', category: 'Test', stockAlert: 5 })
        .expect(400);
    });

    it('doit retourner 400 si stockAlert est négatif', async () => {
      await request(app.getHttpServer())
        .post('/produits')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Produit Invalide', codeBare: 'CB-NEG', category: 'Test', stockAlert: -1 })
        .expect(400);
    });
  });

  // ── GET /produits ─────────────────────────────────────────────────────────

  describe('GET /produits', () => {
    it('doit retourner la liste de tous les produits', async () => {
      const res = await request(app.getHttpServer())
        .get('/produits')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('doit retourner 401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/produits')
        .expect(401);
    });
  });

  // ── GET /produits/:id ─────────────────────────────────────────────────────

  describe('GET /produits/:id', () => {
    it('doit retourner le produit par son ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/produits/${createdProduitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdProduitId);
      expect(res.body.nom).toBe('Produit Test E2E');
    });

    it('doit retourner 404 pour un ID inexistant', async () => {
      await request(app.getHttpServer())
        .get('/produits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── PATCH /produits/:id ───────────────────────────────────────────────────

  describe('PATCH /produits/:id', () => {
    it('doit mettre à jour le prix de vente du produit', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/produits/${createdProduitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ prixVente: 79.99 })
        .expect(200);

      expect(res.body.prixVente).toBe(79.99);
    });

    it('doit mettre à jour le seuil d\'alerte', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/produits/${createdProduitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockAlert: 25 })
        .expect(200);

      expect(res.body.stockAlert).toBe(25);
    });
  });

  // ── DELETE /produits/:id ──────────────────────────────────────────────────

  describe('DELETE /produits/:id', () => {
    it('doit supprimer le produit créé', async () => {
      await request(app.getHttpServer())
        .delete(`/produits/${createdProduitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vérifier que le produit n'existe plus
      await request(app.getHttpServer())
        .get(`/produits/${createdProduitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      createdProduitId = ''; // éviter double suppression dans afterAll
    });
  });
});
