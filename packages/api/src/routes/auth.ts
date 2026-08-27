import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { asyncRouter } from '../utils/asyncRouter.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { authMiddleware, signAccessToken, signRefreshToken, verifyToken } from '../middleware/auth.js';

const router = asyncRouter();

const loginSchema = z.object({
  sharedCode: z.string().min(1),
  password: z.string().min(1),
  asRole: z.enum(['owner', 'partner']).optional(),
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Données invalides' } });
  }

  const settings = await query<{ shared_code_hash: string; welcome_phrase: string }>(
    'SELECT shared_code_hash, welcome_phrase FROM couple_settings LIMIT 1',
  );
  if (settings.rows.length === 0) {
    return res.status(500).json({ error: { code: 'NOT_CONFIGURED', message: 'Couple non configuré' } });
  }

  const [codeHash, passwordHash] = settings.rows[0].shared_code_hash.split(':');
  const codeValid = await bcrypt.compare(parsed.data.sharedCode, codeHash);
  const passwordValid = await bcrypt.compare(parsed.data.password, passwordHash);

  if (!codeValid || !passwordValid) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Code ou mot de passe incorrect' } });
  }

  const role = parsed.data.asRole ?? 'partner';
  const users = await query<{ id: string; display_name: string; avatar_url: string | null; role: string }>(
    'SELECT id, display_name, avatar_url, role FROM users WHERE role = $1 LIMIT 1',
    [role],
  );
  if (users.rows.length === 0) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' } });
  }

  const user = users.rows[0];
  const payload = { userId: user.id, role: user.role };

  res.json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
    welcomePhrase: settings.rows[0].welcome_phrase,
  });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;
  if (!refreshToken) {
    return res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'Refresh token requis' } });
  }

  try {
    const payload = verifyToken(refreshToken, 'refresh');
    // Rotation : chaque refresh consommé renvoie un nouveau couple de tokens.
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Refresh token invalide' } });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const result = await query<{ id: string; display_name: string; avatar_url: string | null; role: string }>(
    'SELECT id, display_name, avatar_url, role FROM users WHERE id = $1',
    [req.user!.userId],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
  }
  const u = result.rows[0];
  res.json({ id: u.id, displayName: u.display_name, avatarUrl: u.avatar_url, role: u.role });
});

export default router;
