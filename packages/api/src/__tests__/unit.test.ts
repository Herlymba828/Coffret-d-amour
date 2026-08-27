import { describe, it, expect } from 'vitest';
import { buildUpdate } from '../utils/sqlUpdate.js';
import { buildStorageKey } from '../services/storage.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../middleware/auth.js';

describe('buildUpdate', () => {
  it("n'écrit que les colonnes réellement présentes dans le body", () => {
    const update = buildUpdate('albums', { title: 'Nos débuts' }, { title: 'title', year: 'year' }, 'abc');
    expect(update?.text).toBe('UPDATE albums SET title = $1 WHERE id = $2 RETURNING *');
    expect(update?.params).toEqual(['Nos débuts', 'abc']);
  });

  it('permet de remettre une colonne à NULL (dépingler un album)', () => {
    const update = buildUpdate('albums', { pinnedMediaId: null }, { pinnedMediaId: 'pinned_media_id' }, 'abc');
    expect(update?.text).toBe('UPDATE albums SET pinned_media_id = $1 WHERE id = $2 RETURNING *');
    expect(update?.params).toEqual([null, 'abc']);
  });

  it('numérote les paramètres dans l’ordre des colonnes fournies', () => {
    const update = buildUpdate(
      'media',
      { caption: 'été 2023', isPinned: true },
      { caption: 'caption', isPinned: 'is_pinned' },
      'id-1',
    );
    expect(update?.text).toBe('UPDATE media SET caption = $1, is_pinned = $2 WHERE id = $3 RETURNING *');
    expect(update?.params).toEqual(['été 2023', true, 'id-1']);
  });

  it('renvoie null quand il n’y a rien à modifier', () => {
    expect(buildUpdate('albums', {}, { title: 'title' }, 'abc')).toBeNull();
  });

  it('ignore les clés hors liste blanche', () => {
    const update = buildUpdate('albums', { role: 'admin' }, { title: 'title' }, 'abc');
    expect(update).toBeNull();
  });
});

describe('buildStorageKey', () => {
  it('range le fichier sous le préfixe de son auteur', () => {
    expect(buildStorageKey('user-1', 'photo.JPG')).toMatch(/^photos\/user-1\/[0-9a-f-]{36}\.JPG$/);
  });

  it('ne laisse pas un nom de fichier piégé remonter dans le bucket', () => {
    const key = buildStorageKey('user-1', '../../../etc/passwd');
    expect(key.startsWith('photos/user-1/')).toBe(true);
    expect(key).not.toContain('..');
  });

  it('retombe sur .bin quand il n’y a pas d’extension', () => {
    expect(buildStorageKey('user-1', 'sans-extension')).toMatch(/\.bin$/);
  });

  it('génère une clé différente à chaque appel', () => {
    expect(buildStorageKey('user-1', 'a.png')).not.toBe(buildStorageKey('user-1', 'a.png'));
  });
});

describe('séparation des types de token', () => {
  const payload = { userId: '11111111-1111-1111-1111-111111111111', role: 'owner' };

  it('accepte un access token comme access token', () => {
    expect(verifyToken(signAccessToken(payload), 'access')).toEqual(payload);
  });

  it('refuse un refresh token présenté comme access token', () => {
    expect(() => verifyToken(signRefreshToken(payload), 'access')).toThrow();
  });

  it('refuse un access token présenté comme refresh token', () => {
    expect(() => verifyToken(signAccessToken(payload), 'refresh')).toThrow();
  });

  it('refuse un token signé avec un autre secret', () => {
    expect(() => verifyToken('eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.mauvaise-signature', 'access')).toThrow();
  });
});

describe('rateLimit', () => {
  it('laisse passer sous le seuil puis renvoie 429 avec Retry-After', async () => {
    const express = (await import('express')).default;
    const request = (await import('supertest')).default;
    const { rateLimit } = await import('../middleware/rateLimit.js');

    const app = express();
    app.post('/login', rateLimit({ windowMs: 60_000, max: 3 }), (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/login')).status).toBe(200);
    }

    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeTruthy();
  });

  it('repart à zéro une fois la fenêtre écoulée', async () => {
    const express = (await import('express')).default;
    const request = (await import('supertest')).default;
    const { rateLimit } = await import('../middleware/rateLimit.js');

    const app = express();
    app.post('/login', rateLimit({ windowMs: 20, max: 1 }), (_req, res) => res.json({ ok: true }));

    expect((await request(app).post('/login')).status).toBe(200);
    expect((await request(app).post('/login')).status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect((await request(app).post('/login')).status).toBe(200);
  });
});
