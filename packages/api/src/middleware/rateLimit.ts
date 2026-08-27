import { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Limiteur en mémoire, suffisant pour une app à deux utilisateurs
 * (une seule instance, pas de dépendance externe).
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: { code: 'TOO_MANY_REQUESTS', message: `Trop de tentatives. Réessaie dans ${retryAfter}s.` },
      });
    }

    // Purge opportuniste des entrées expirées.
    if (buckets.size > 100) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }

    next();
  };
}
