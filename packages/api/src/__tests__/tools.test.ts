import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../db/pool.js', () => ({
  query: mockQuery,
  pool: { query: mockQuery, connect: vi.fn(), end: vi.fn() },
}));

const { createApp } = await import('../app.js');
const { signAccessToken } = await import('../middleware/auth.js');

const app = createApp();
const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = signAccessToken({ userId: USER_ID, role: 'partner' });

beforeEach(() => {
  mockQuery.mockReset();
});

describe('/v1/tools', () => {
  describe('Vouchers', () => {
    it('liste les bons romantiques', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'v-1',
            title: 'Massage 20min',
            description: 'Massage relaxant',
            icon: 'Sparkles',
            category: 'romantic',
            issued_to: null,
            is_used: false,
            used_at: null,
            created_by: null,
            created_at: '2026-07-13T10:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/v1/tools/vouchers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Massage 20min');
      expect(res.body[0].isUsed).toBe(false);
    });

    it('crée un bon personnalisé', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'v-2',
            title: 'Cinéma en amoureux',
            description: 'Film au choix + pop corn',
            icon: 'Tv',
            category: 'fun',
            issued_to: null,
            is_used: false,
            used_at: null,
            created_by: USER_ID,
            created_at: '2026-07-13T10:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .post('/v1/tools/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Cinéma en amoureux',
          description: 'Film au choix + pop corn',
          category: 'fun',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Cinéma en amoureux');
    });

    it('utilise un bon romantique', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'v-1',
            title: 'Massage 20min',
            description: 'Massage relaxant',
            icon: 'Sparkles',
            category: 'romantic',
            issued_to: null,
            is_used: true,
            used_at: '2026-07-13T12:00:00Z',
            created_by: null,
            created_at: '2026-07-13T10:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .post('/v1/tools/vouchers/v-1/redeem')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.isUsed).toBe(true);
    });
  });

  describe('Partner Preferences', () => {
    it('enregistre ou met à jour une préférence', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pref-1',
            user_id: USER_ID,
            category: 'drink',
            key_name: 'Café',
            value_text: 'Cappuccino au lait d avoine',
            updated_at: '2026-07-13T12:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .put('/v1/tools/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'drink',
          keyName: 'Café',
          valueText: 'Cappuccino au lait d avoine',
        });

      expect(res.status).toBe(200);
      expect(res.body.valueText).toBe('Cappuccino au lait d avoine');
    });
  });

  describe('Bucket List', () => {
    it('crée et bascule un item de la bucket list', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'b-1',
            title: 'Aurores boréales',
            category: 'voyage',
            is_completed: false,
            completed_at: null,
            note: 'Islande',
            created_by: USER_ID,
            created_at: '2026-07-13T10:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .post('/v1/tools/bucket-list')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Aurores boréales',
          category: 'voyage',
          note: 'Islande',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Aurores boréales');

      // Toggle
      mockQuery
        .mockResolvedValueOnce({ rows: [{ is_completed: false }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'b-1',
              title: 'Aurores boréales',
              category: 'voyage',
              is_completed: true,
              completed_at: '2026-07-13T12:00:00Z',
              note: 'Islande',
              created_by: USER_ID,
              created_at: '2026-07-13T10:00:00Z',
            },
          ],
        });

      const toggleRes = await request(app)
        .patch('/v1/tools/bucket-list/b-1/toggle')
        .set('Authorization', `Bearer ${token}`);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.isCompleted).toBe(true);
    });
  });

  describe('Date Ideas & Sparks', () => {
    it('renvoie les idées de sorties et les sparks', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'd-1',
            title: 'Dîner chandelles',
            category: 'cocooning',
            description: 'Soirée à la maison',
            duration_minutes: 90,
            budget_level: 1,
          },
        ],
      });

      const res = await request(app)
        .get('/v1/tools/date-ideas')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].title).toBe('Dîner chandelles');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 's-1',
            question: 'Quel est ton premier souvenir de nous ?',
            category: 'memoire',
          },
        ],
      });

      const sparkRes = await request(app)
        .get('/v1/tools/sparks/random?count=1')
        .set('Authorization', `Bearer ${token}`);

      expect(sparkRes.status).toBe(200);
      expect(sparkRes.body[0].question).toContain('premier souvenir');
    });
  });

  describe('Heart Checkins', () => {
    it('enregistre un check-in de la semaine', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'c-1',
              user_id: USER_ID,
              energy_level: 4,
              affection_need: 5,
              week_happiness: 5,
              favorite_moment: 'Notre promenade sous la pluie',
              week_date: '2026-07-13',
              created_at: '2026-07-13T18:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ display_name: 'Marie' }],
        });

      const res = await request(app)
        .post('/v1/tools/checkins')
        .set('Authorization', `Bearer ${token}`)
        .send({
          energyLevel: 4,
          affectionNeed: 5,
          weekHappiness: 5,
          favoriteMoment: 'Notre promenade sous la pluie',
        });

      expect(res.status).toBe(201);
      expect(res.body.weekHappiness).toBe(5);
      expect(res.body.userDisplayName).toBe('Marie');
    });
  });
});
