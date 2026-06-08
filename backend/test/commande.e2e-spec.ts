import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getAdminToken, getAchatToken } from './helpers/auth.helper';
import { cleanTestData, prisma } from './helpers/db.helper';

/**
 * Tests E2E — Commandes d'achat
 * Routes : POST/GET/PATCH/DELETE /commandes
 * Règles métier :
 *   - type=ACHAT exige fournisseurId + entrepotId
 *   - Transitions d'état : EN_COURS → FERMEE → LIVREE | ANNULEE
 *   - LIVREE et ANNULEE sont verrouillées
 */
describe('Commandes API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let achatToken: string;
  let adminUserId: string;
  let fournisseurId: string;
  let entrepotId: string;
  let commandeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    adminToken = await getAdminToken(app);
    achatToken = await getAchatToken(app);

    // Récupérer l'userId admin depuis le profil
    const profileRes = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    adminUserId = profileRes.body.userId;

    // Récupérer un fournisseur existant (seed)
    const fournisseurRes = await request(app.getHttpServer())
      .get('/fournisseurs')
      .set('Authorization', `Bearer ${adminToken}`);
    fournisseurId = fournisseurRes.body[0].id;

    // Récupérer un entrepôt existant (seed)
    const entrepotRes = await request(app.getHttpServer())
      .get('/entrepots')
      .set('Authorization', `Bearer ${adminToken}`);
    entrepotId = entrepotRes.body[0].id;
  });

  afterAll(async () => {
    if (commandeId) {
      await cleanTestData({ commandeIds: [commandeId] });
    }
    await app.close();
  });

  // ── POST /commandes ───────────────────────────────────────────────────────

  describe('POST /commandes', () => {
    it('doit créer une commande d\'achat avec fournisseur et entrepôt', async () => {
      const res = await request(app.getHttpServer())
        .post('/commandes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'ACHAT',
          userId: adminUserId,
          fournisseurId,
          entrepotId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.etat).toBe('EN_COURS');
      expect(res.body.type).toBe('ACHAT');
      commandeId = res.body.id;
    });

    it('doit retourner 400 sans fournisseurId pour type=ACHAT', async () => {
      await request(app.getHttpServer())
        .post('/commandes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'ACHAT', userId: adminUserId, entrepotId })
        .expect(400);
    });

    it('doit retourner 400 sans entrepotId pour type=ACHAT', async () => {
      await request(app.getHttpServer())
        .post('/commandes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'ACHAT', userId: adminUserId, fournisseurId })
        .expect(400);
    });

    it('doit retourner 401 sans token', async () => {
      await request(app.getHttpServer())
        .post('/commandes')
        .send({ type: 'ACHAT', userId: adminUserId, fournisseurId, entrepotId })
        .expect(401);
    });
  });

  // ── GET /commandes ────────────────────────────────────────────────────────

  describe('GET /commandes', () => {
    it('doit retourner la liste des commandes', async () => {
      const res = await request(app.getHttpServer())
        .get('/commandes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── GET /commandes/:id ────────────────────────────────────────────────────

  describe('GET /commandes/:id', () => {
    it('doit retourner la commande par son ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/commandes/${commandeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(commandeId);
      expect(res.body.etat).toBe('EN_COURS');
    });

    it('doit retourner 404 pour un ID inexistant', async () => {
      await request(app.getHttpServer())
        .get('/commandes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── PATCH /commandes/:id — Transition EN_COURS → FERMEE ──────────────────

  describe('PATCH /commandes/:id — Transition EN_COURS → FERMEE', () => {
    it('doit passer la commande à l\'état FERMEE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/commandes/${commandeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ etat: 'FERMEE' })
        .expect(200);

      expect(res.body.etat).toBe('FERMEE');
    });
  });

  // ── DELETE /commandes/:id — interdit si LIVREE ────────────────────────────

  describe('DELETE /commandes/:id', () => {
    it('doit supprimer une commande FERMEE', async () => {
      await request(app.getHttpServer())
        .delete(`/commandes/${commandeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      commandeId = '';
    });
  });
});
