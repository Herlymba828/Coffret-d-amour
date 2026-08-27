import { z } from 'zod';
import type { Server } from 'socket.io';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';
import { getPartnerId } from '../services/partner.js';

const router = asyncRouter();

export function mapMessage(row: Record<string, unknown>) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    type: row.type,
    mediaUrl: row.media_url,
    isEphemeral: row.is_ephemeral,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

router.get('/messages', authMiddleware, async (req, res) => {
  const params = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      before: z.string().datetime().optional(),
    })
    .safeParse(req.query);

  if (!params.success) {
    return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Paramètres invalides' } });
  }

  const { limit, before } = params.data;
  const result = await query(
    `SELECT * FROM messages
     WHERE (sender_id = $1 OR receiver_id = $1)
       AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
     ORDER BY created_at DESC
     LIMIT $3`,
    [req.user!.userId, before ?? null, limit],
  );

  res.json(result.rows.map(mapMessage).reverse());
});

router.post('/messages', authMiddleware, async (req, res) => {
  const schema = z.object({
    content: z.string().min(1).max(5000),
    type: z.enum(['text', 'image', 'video', 'voice', 'ephemeral']).default('text'),
    mediaId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const partnerId = await getPartnerId(req.user!.userId);
  if (!partnerId) {
    return res.status(404).json({ error: { code: 'PARTNER_NOT_FOUND', message: 'Partenaire introuvable' } });
  }

  let mediaUrl: string | null = null;
  if (parsed.data.mediaId) {
    const media = await query('SELECT id FROM media WHERE id = $1 AND uploaded_at IS NOT NULL', [
      parsed.data.mediaId,
    ]);
    if (media.rows.length === 0) {
      return res.status(404).json({ error: { code: 'MEDIA_NOT_FOUND', message: 'Média introuvable' } });
    }
    mediaUrl = `/media/${parsed.data.mediaId}`;
  }

  const result = await query(
    `INSERT INTO messages (sender_id, receiver_id, content, type, media_url, is_ephemeral)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      req.user!.userId,
      partnerId,
      parsed.data.content,
      parsed.data.type,
      mediaUrl,
      parsed.data.type === 'ephemeral',
    ],
  );

  const message = mapMessage(result.rows[0]);
  (req.app.get('io') as Server | undefined)?.to(partnerId).emit('message:new', message);
  res.status(201).json(message);
});

router.patch('/messages/:id/read', authMiddleware, async (req, res) => {
  const result = await query(
    `UPDATE messages SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND receiver_id = $2 AND is_read = FALSE
     RETURNING *`,
    [req.params.id, req.user!.userId],
  );

  if (result.rows.length === 0) {
    // Déjà lu, ou message non destiné à cet utilisateur : idempotent,
    // on ne rejoue pas l'accusé de lecture.
    const existing = await query('SELECT * FROM messages WHERE id = $1 AND receiver_id = $2', [
      req.params.id,
      req.user!.userId,
    ]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message introuvable' } });
    }
    return res.json(mapMessage(existing.rows[0]));
  }

  const message = mapMessage(result.rows[0]);
  (req.app.get('io') as Server | undefined)
    ?.to(message.senderId as string)
    .emit('message:read', { messageId: message.id, readAt: message.readAt });
  res.json(message);
});

router.get('/phrases', authMiddleware, async (_req, res) => {
  const result = await query('SELECT id, content, is_default FROM love_phrases ORDER BY is_default DESC, id');
  res.json(result.rows.map((r) => ({ id: r.id, content: r.content, isDefault: r.is_default })));
});

router.get('/unread-count', authMiddleware, async (req, res) => {
  const result = await query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
    [req.user!.userId],
  );
  res.json({ count: result.rows[0].count });
});

export default router;
