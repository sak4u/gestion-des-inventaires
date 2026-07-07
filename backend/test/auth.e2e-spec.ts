import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Tests E2E — Authentification
 * Credentials seed : admin@email.com / admin123
 */
describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Récupérer le token dans beforeAll pour que tous les tests suivants l'aient
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@email.com', password: 'admin123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /auth/login ──────────────────────────────────────────────────────
  // NestJS retourne 201 par défaut pour les POST (comportement standard REST)

  describe('POST /auth/login', () => {
    it('doit retourner un token JWT avec des credentials valides (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@email.com', password: 'admin123' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('admin@email.com');
    });

    it('doit retourner un token JWT avec des credentials valides (RESPONSABLE_STOCK)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'manager@email.com', password: 'admin123' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user.role.name).toBe('RESPONSABLE_STOCK');
    });

    it('doit retourner un token JWT avec des credentials valides (ACHAT)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'achat@email.com', password: 'admin123' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user.role.name).toBe('ACHAT');
    });

    it('doit retourner 401 avec un mauvais mot de passe', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@email.com', password: 'MauvaisPass!' })
        .expect(401);
    });

    it('doit retourner 401 avec un email inexistant', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inexistant@test.com', password: 'Test1234!' })
        .expect(401);
    });

    it('doit retourner 400 si le body est vide', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ── GET /auth/profile ─────────────────────────────────────────────────────

  describe('GET /auth/profile', () => {
    it('doit retourner le profil avec un token valide', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('role');
    });

    it('doit retourner 401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('doit retourner 401 avec un token invalide', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer token_invalide_xxxxxx')
        .expect(401);
    });
  });

  // ── GET /auth/users (ADMIN only) ──────────────────────────────────────────

  describe('GET /auth/users', () => {
    it('doit retourner la liste des utilisateurs pour ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('doit retourner 403 pour un rôle non ADMIN', async () => {
      const stockRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'manager@email.com', password: 'admin123' });

      await request(app.getHttpServer())
        .get('/auth/users')
        .set('Authorization', `Bearer ${stockRes.body.access_token}`)
        .expect(403);
    });
  });

  // ── GET /auth/roles ───────────────────────────────────────────────────────

  describe('GET /auth/roles', () => {
    it('doit retourner les 3 rôles disponibles', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const roleNames = res.body.map((r: any) => r.name);
      expect(roleNames).toContain('ADMIN');
      expect(roleNames).toContain('RESPONSABLE_STOCK');
      expect(roleNames).toContain('ACHAT');
    });
  });

  // ── POST /auth/forgot-password ────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('doit retourner un message de confirmation (même si email inexistant)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'inexistant@test.com' })
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });
});
