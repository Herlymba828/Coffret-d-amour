import { z } from 'zod';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter();

// ============================================================
// 1. Chéquier de Bons Romantiques (Vouchers)
// ============================================================

function mapVoucher(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon ?? 'Gift',
    category: row.category ?? 'romantic',
    issuedTo: row.issued_to,
    isUsed: Boolean(row.is_used),
    usedAt: row.used_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

router.get('/vouchers', authMiddleware, async (_req, res) => {
  const result = await query(
    `SELECT * FROM vouchers
     ORDER BY is_used ASC, created_at DESC`,
  );
  res.json(result.rows.map(mapVoucher));
});

router.post('/vouchers', authMiddleware, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    icon: z.string().max(50).optional(),
    category: z.enum(['romantic', 'service', 'fun', 'naughty', 'peace']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const result = await query(
    `INSERT INTO vouchers (title, description, icon, category, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      parsed.data.title,
      parsed.data.description,
      parsed.data.icon ?? 'Gift',
      parsed.data.category ?? 'romantic',
      req.user!.userId,
    ],
  );

  res.status(201).json(mapVoucher(result.rows[0]));
});

router.post('/vouchers/:id/redeem', authMiddleware, async (req, res) => {
  const result = await query(
    `UPDATE vouchers
     SET is_used = TRUE, used_at = NOW()
     WHERE id = $1 AND is_used = FALSE
     RETURNING *`,
    [req.params.id],
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: { code: 'CANNOT_REDEEM', message: 'Bon introuvable ou déjà utilisé' } });
  }

  res.json(mapVoucher(result.rows[0]));
});

// ============================================================
// 2. Mémo Secret des Goûts (Partner Preferences)
// ============================================================

function mapPreference(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    keyName: row.key_name,
    valueText: row.value_text,
    updatedAt: row.updated_at,
  };
}

router.get('/preferences', authMiddleware, async (_req, res) => {
  const result = await query(
    `SELECT * FROM partner_preferences
     ORDER BY category ASC, key_name ASC`,
  );
  res.json(result.rows.map(mapPreference));
});

router.put('/preferences', authMiddleware, async (req, res) => {
  const schema = z.object({
    category: z.enum(['drink', 'sizes', 'favorites', 'allergies', 'comfort', 'wishlist', 'custom']),
    keyName: z.string().min(1).max(100),
    valueText: z.string().min(1),
    userId: z.string().uuid().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const targetUserId = parsed.data.userId ?? req.user!.userId;

  const result = await query(
    `INSERT INTO partner_preferences (user_id, category, key_name, value_text, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, category, key_name)
     DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = NOW()
     RETURNING *`,
    [targetUserId, parsed.data.category, parsed.data.keyName, parsed.data.valueText],
  );

  res.json(mapPreference(result.rows[0]));
});

router.delete('/preferences/:id', authMiddleware, async (req, res) => {
  const result = await query(
    `DELETE FROM partner_preferences WHERE id = $1 RETURNING id`,
    [req.params.id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Préférence introuvable' } });
  }
  res.status(204).send();
});

// ============================================================
// 3. Bucket List à Deux
// ============================================================

function mapBucketItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

router.get('/bucket-list', authMiddleware, async (_req, res) => {
  const result = await query(
    `SELECT * FROM bucket_list
     ORDER BY is_completed ASC, created_at DESC`,
  );
  res.json(result.rows.map(mapBucketItem));
});

router.post('/bucket-list', authMiddleware, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(255),
    category: z.enum(['voyage', 'aventure', 'romantique', 'quotidien', 'gourmand']).optional(),
    note: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const result = await query(
    `INSERT INTO bucket_list (title, category, note, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      parsed.data.title,
      parsed.data.category ?? 'voyage',
      parsed.data.note ?? null,
      req.user!.userId,
    ],
  );

  res.status(201).json(mapBucketItem(result.rows[0]));
});

router.patch('/bucket-list/:id/toggle', authMiddleware, async (req, res) => {
  const check = await query(`SELECT is_completed FROM bucket_list WHERE id = $1`, [req.params.id]);
  if (check.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Défi introuvable' } });
  }

  const nextState = !check.rows[0].is_completed;
  const result = await query(
    `UPDATE bucket_list
     SET is_completed = $1, completed_at = $2
     WHERE id = $3 RETURNING *`,
    [nextState, nextState ? new Date() : null, req.params.id],
  );

  res.json(mapBucketItem(result.rows[0]));
});

router.delete('/bucket-list/:id', authMiddleware, async (req, res) => {
  const result = await query(`DELETE FROM bucket_list WHERE id = $1 RETURNING id`, [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Défi introuvable' } });
  }
  res.status(204).send();
});

// ============================================================
// 4. Idées de Sorties (Date Ideas) & Sparks
// ============================================================

router.get('/date-ideas', authMiddleware, async (_req, res) => {
  const result = await query(`SELECT * FROM date_ideas ORDER BY category ASC`);
  res.json(
    result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      durationMinutes: row.duration_minutes,
      budgetLevel: row.budget_level,
    })),
  );
});

router.get('/sparks/random', authMiddleware, async (req, res) => {
  const count = Math.min(Math.max(Number(req.query.count ?? 1), 1), 5);
  const result = await query(
    `SELECT * FROM date_sparks ORDER BY RANDOM() LIMIT $1`,
    [count],
  );
  res.json(
    result.rows.map((row) => ({
      id: row.id,
      question: row.question,
      category: row.category,
    })),
  );
});

// ============================================================
// 5. Météo du Cœur (Heart Checkins)
// ============================================================

router.get('/checkins', authMiddleware, async (_req, res) => {
  const result = await query(
    `SELECT c.*, u.display_name
     FROM heart_checkins c
     JOIN users u ON u.id = c.user_id
     ORDER BY c.week_date DESC, c.created_at DESC
     LIMIT 30`,
  );

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userDisplayName: row.display_name,
      energyLevel: row.energy_level,
      affectionNeed: row.affection_need,
      weekHappiness: row.week_happiness,
      favoriteMoment: row.favorite_moment,
      weekDate: row.week_date,
      createdAt: row.created_at,
    })),
  );
});

router.post('/checkins', authMiddleware, async (req, res) => {
  const schema = z.object({
    energyLevel: z.number().int().min(1).max(5),
    affectionNeed: z.number().int().min(1).max(5),
    weekHappiness: z.number().int().min(1).max(5),
    favoriteMoment: z.string().min(1).max(1000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const result = await query(
    `INSERT INTO heart_checkins (user_id, energy_level, affection_need, week_happiness, favorite_moment, week_date)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
     RETURNING *`,
    [
      req.user!.userId,
      parsed.data.energyLevel,
      parsed.data.affectionNeed,
      parsed.data.weekHappiness,
      parsed.data.favoriteMoment,
    ],
  );

  const me = await query(`SELECT display_name FROM users WHERE id = $1`, [req.user!.userId]);

  res.status(201).json({
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    userDisplayName: me.rows[0]?.display_name ?? 'Moi',
    energyLevel: result.rows[0].energy_level,
    affectionNeed: result.rows[0].affection_need,
    weekHappiness: result.rows[0].week_happiness,
    favoriteMoment: result.rows[0].favorite_moment,
    weekDate: result.rows[0].week_date,
    createdAt: result.rows[0].created_at,
  });
});

export default router;
