import { z } from 'zod';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';
import { buildUpdate } from '../utils/sqlUpdate.js';
import { getReadUrl } from '../services/storage.js';

const router = asyncRouter();

function mapAlbum(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    theme: row.theme,
    coverMediaId: row.cover_media_id,
    pinnedMediaId: row.pinned_media_id,
    mediaCount: row.media_count,
    createdAt: row.created_at,
  };
}

router.get('/', authMiddleware, async (_req, res) => {
  const result = await query(
    `SELECT a.*, COUNT(m.id)::int AS media_count
     FROM albums a
     LEFT JOIN media m ON m.album_id = a.id AND m.uploaded_at IS NOT NULL
     GROUP BY a.id
     ORDER BY a.year DESC NULLS LAST, a.created_at DESC`,
  );
  res.json(result.rows.map(mapAlbum));
});

router.post('/', authMiddleware, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    year: z.number().int().optional(),
    theme: z.string().max(100).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const result = await query(
    `INSERT INTO albums (title, year, theme, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [parsed.data.title, parsed.data.year ?? null, parsed.data.theme ?? null, req.user!.userId],
  );
  res.status(201).json({ ...mapAlbum(result.rows[0]), mediaCount: 0 });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const album = await query('SELECT * FROM albums WHERE id = $1', [req.params.id]);
  if (album.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Album introuvable' } });
  }

  const media = await query(
    `SELECT * FROM media
     WHERE album_id = $1 AND uploaded_at IS NOT NULL
     ORDER BY is_pinned DESC, created_at DESC`,
    [req.params.id],
  );

  const items = await Promise.all(
    media.rows.map(async (m) => ({
      id: m.id,
      albumId: m.album_id,
      uploadedBy: m.uploaded_by,
      mimeType: m.mime_type,
      filename: m.filename,
      caption: m.caption,
      width: m.width,
      height: m.height,
      isPinned: m.is_pinned,
      createdAt: m.created_at,
      readUrl: m.storage_key ? await getReadUrl(m.storage_key) : null,
      thumbnailUrl: m.thumbnail_key ? await getReadUrl(m.thumbnail_key) : null,
    })),
  );

  res.json({ ...mapAlbum(album.rows[0]), mediaCount: items.length, media: items });
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    year: z.number().int().nullable().optional(),
    theme: z.string().max(100).nullable().optional(),
    coverMediaId: z.string().uuid().nullable().optional(),
    pinnedMediaId: z.string().uuid().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const update = buildUpdate('albums', parsed.data, {
    title: 'title',
    year: 'year',
    theme: 'theme',
    coverMediaId: 'cover_media_id',
    pinnedMediaId: 'pinned_media_id',
  }, String(req.params.id));

  if (!update) {
    return res.status(400).json({ error: { code: 'EMPTY_UPDATE', message: 'Aucun champ à modifier' } });
  }

  const result = await query(update.text, update.params);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Album introuvable' } });
  }
  res.json(mapAlbum(result.rows[0]));
});

export default router;
