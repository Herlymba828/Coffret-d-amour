import { z } from 'zod';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';
import { buildUpdate } from '../utils/sqlUpdate.js';
import { buildStorageKey, getReadUrl, getUploadUrl, objectExists, deleteObject } from '../services/storage.js';
import { generateDerivatives, type MediaDerivatives } from '../services/thumbnails.js';

const router = asyncRouter();

const UPLOAD_TTL_SECONDS = 3600;

router.post('/presign', authMiddleware, async (req, res) => {
  const schema = z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(100),
    albumId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const storageKey = buildStorageKey(req.user!.userId, parsed.data.filename);
  const uploadUrl = await getUploadUrl(storageKey, parsed.data.mimeType, UPLOAD_TTL_SECONDS);

  // uploaded_at reste NULL tant que /confirm n'a pas vu l'objet arriver :
  // les lignes orphelines sont exclues de la galerie et des compteurs.
  const result = await query(
    `INSERT INTO media (album_id, uploaded_by, storage_key, mime_type, filename)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [parsed.data.albumId ?? null, req.user!.userId, storageKey, parsed.data.mimeType, parsed.data.filename],
  );

  res.json({ mediaId: result.rows[0].id, uploadUrl, expiresIn: UPLOAD_TTL_SECONDS });
});

router.post('/:id/confirm', authMiddleware, async (req, res) => {
  const result = await query('SELECT * FROM media WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Média introuvable' } });
  }

  const m = result.rows[0];
  if (!(await objectExists(m.storage_key))) {
    await query('DELETE FROM media WHERE id = $1 AND uploaded_at IS NULL', [m.id]);
    return res.status(409).json({ error: { code: 'UPLOAD_MISSING', message: "Le fichier n'a pas été envoyé" } });
  }

  // Une miniature ratée ne doit pas faire échouer l'ajout d'une photo :
  // la galerie retombe sur l'original.
  let derivatives: MediaDerivatives = { thumbnailKey: null, width: null, height: null };
  try {
    derivatives = await generateDerivatives(m.storage_key, m.mime_type);
  } catch (err) {
    console.warn(`Miniature non générée pour ${m.id}:`, (err as Error).message);
  }

  const confirmed = await query(
    `UPDATE media SET
      uploaded_at = COALESCE(uploaded_at, NOW()),
      thumbnail_key = COALESCE($2, thumbnail_key),
      width = COALESCE($3, width),
      height = COALESCE($4, height)
     WHERE id = $1 RETURNING *`,
    [m.id, derivatives.thumbnailKey, derivatives.width, derivatives.height],
  );
  const row = confirmed.rows[0];

  res.json({
    id: row.id,
    albumId: row.album_id,
    mimeType: row.mime_type,
    filename: row.filename,
    width: row.width,
    height: row.height,
    readUrl: await getReadUrl(row.storage_key),
    thumbnailUrl: row.thumbnail_key ? await getReadUrl(row.thumbnail_key) : null,
    createdAt: row.created_at,
  });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const result = await query('SELECT * FROM media WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Média introuvable' } });
  }
  const m = result.rows[0];
  res.json({
    id: m.id,
    albumId: m.album_id,
    mimeType: m.mime_type,
    filename: m.filename,
    caption: m.caption,
    isPinned: m.is_pinned,
    width: m.width,
    height: m.height,
    readUrl: m.storage_key ? await getReadUrl(m.storage_key) : null,
    thumbnailUrl: m.thumbnail_key ? await getReadUrl(m.thumbnail_key) : null,
    createdAt: m.created_at,
  });
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const schema = z.object({
    caption: z.string().max(1000).nullable().optional(),
    isPinned: z.boolean().optional(),
    albumId: z.string().uuid().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const update = buildUpdate('media', parsed.data, {
    caption: 'caption',
    isPinned: 'is_pinned',
    albumId: 'album_id',
  }, String(req.params.id));

  if (!update) {
    return res.status(400).json({ error: { code: 'EMPTY_UPDATE', message: 'Aucun champ à modifier' } });
  }

  const result = await query(update.text, update.params);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Média introuvable' } });
  }
  const m = result.rows[0];
  res.json({
    id: m.id,
    caption: m.caption,
    isPinned: m.is_pinned,
    albumId: m.album_id,
  });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const result = await query<{ id: string; storage_key: string; thumbnail_key: string | null }>(
    'DELETE FROM media WHERE id = $1 RETURNING id, storage_key, thumbnail_key',
    [req.params.id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Média introuvable' } });
  }

  // Les fichiers ne doivent pas survivre à leur ligne : on ignore l'échec S3
  // (objet déjà supprimé, ou miniature jamais générée).
  const { storage_key, thumbnail_key } = result.rows[0];
  for (const key of [storage_key, thumbnail_key]) {
    if (!key) continue;
    await deleteObject(key).catch((err) => {
      console.warn(`Suppression S3 échouée (${key}):`, (err as Error).message);
    });
  }

  res.status(204).send();
});

export default router;
