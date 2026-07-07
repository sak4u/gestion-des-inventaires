import request from 'supertest';

// Credentials réels définis dans prisma/seed.ts
// email: admin@email.com / manager@email.com / achat@email.com — password: admin123

export async function getAdminToken(app: any): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'admin@email.com', password: 'admin123' });
  return response.body.access_token;
}

export async function getStockToken(app: any): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'manager@email.com', password: 'admin123' });
  return response.body.access_token;
}

export async function getAchatToken(app: any): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'achat@email.com', password: 'admin123' });
  return response.body.access_token;
}
