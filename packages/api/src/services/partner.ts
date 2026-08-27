import { query } from '../db/pool.js';

const cache = new Map<string, string>();

/**
 * Le couple est fixe (deux comptes) : inutile d'interroger Postgres à chaque
 * frappe clavier (`typing:start` / `typing:stop`).
 */
export async function getPartnerId(userId: string): Promise<string | null> {
  const cached = cache.get(userId);
  if (cached) return cached;

  const result = await query<{ id: string }>('SELECT id FROM users WHERE id != $1 LIMIT 1', [userId]);
  const partnerId = result.rows[0]?.id ?? null;
  if (partnerId) cache.set(userId, partnerId);
  return partnerId;
}

export function clearPartnerCache() {
  cache.clear();
}
