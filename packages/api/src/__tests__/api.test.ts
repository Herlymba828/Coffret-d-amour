import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../db/pool.js', () => ({
  query: mockQuery,
  pool: { query: mockQuery, connect: vi.fn(), end: vi.fn() },
}));

const { createApp } = await import('../app.js');
const { signAccessToken, signRefreshToken } = await import('../middleware/auth.js');
const bcrypt = (await import('bcryptjs')).default;

const app = createApp();

const SHARED_CODE = '14-02-2020-Marie';
const PASSWORD = 'notre-coffret';
const USER = { id: '11111111-1111-1111-1111-111111111111', display_name: 'Marie', avatar_url: null, role: 'partner' };

let coupleRow: { shared_code_hash: string; welcome_phrase: string };

beforeEach(async () => {
  mockQuery.mockReset();
  coupleRow ??= {
    shared_code_hash: `${await bcrypt.hash(SHARED_CODE, 4)}:${await bcrypt.hash(PASSWORD, 4)}`,
    welcome_phrase: 'Bienvenue dans notre coffret',
  };
});

/** Login nominal : couple configuré puis utilisateur trouvé. */
function mockSuccessfulLogin() {
  mockQuery
    .mockResolvedValueOnce({ rows: [coupleRow] })
    .mockResolvedValueOnce({ rows: [USER] });
}

describe('routage et gestion des erreurs', () => {
  it('renvoie un 404 JSON sur une route inconnue', async () => {
    const res = await request(app).get('/v1/inexistant');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // Régression : avant le wrapper asyncRouter, une erreur SQL laissait la
  // requête pendante et faisait tomber le process (Express 4).
  it('transforme une erreur SQL en réponse 500 au lieu de rester pendu', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ sharedCode: SHARED_CODE, password: PASSWORD });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('signale la base injoignable sur /health', async () => {
    mockQuery.mockRejectedValueOnce(new Error('down'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('disconnected');
  });
});

describe('POST /v1/auth/login', () => {
  it('délivre un couple de tokens avec les bons identifiants', async () => {
    mockSuccessfulLogin();
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ sharedCode: SHARED_CODE, password: PASSWORD, asRole: 'partner' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.accessToken).not.toBe(res.body.refreshToken);
    expect(res.body.user).toMatchObject({ id: USER.id, displayName: 'Marie', role: 'partner' });
  });

  it('refuse un mot de passe incorrect', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [coupleRow] });
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ sharedCode: SHARED_CODE, password: 'mauvais' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refuse un body incomplet sans toucher à la base', async () => {
    const res = await request(app).post('/v1/auth/login').send({ sharedCode: SHARED_CODE });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('protection des routes', () => {
  it('refuse une route protégée sans token', async () => {
    const res = await request(app).get('/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('refuse un refresh token utilisé comme bearer', async () => {
    const token = signRefreshToken({ userId: USER.id, role: USER.role });
    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('accepte un access token valide', async () => {
    const token = signAccessToken({ userId: USER.id, role: USER.role });
    mockQuery.mockResolvedValueOnce({ rows: [USER] });
    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: USER.id, displayName: 'Marie' });
  });
});

describe('POST /v1/auth/refresh', () => {
  it('échange un refresh token contre un nouveau couple de tokens', async () => {
    const token = signRefreshToken({ userId: USER.id, role: USER.role });
    const res = await request(app).post('/v1/auth/refresh').send({ refreshToken: token });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('refuse un access token présenté au refresh', async () => {
    const token = signAccessToken({ userId: USER.id, role: USER.role });
    const res = await request(app).post('/v1/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
  });
});

describe('validation des entrées', () => {
  it('rejette un type de message hors énumération', async () => {
    const token = signAccessToken({ userId: USER.id, role: USER.role });
    const res = await request(app)
      .post('/v1/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'coucou', type: 'pas-un-type' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejette un message vide', async () => {
    const token = signAccessToken({ userId: USER.id, role: USER.role });
    const res = await request(app)
      .post('/v1/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });
});
