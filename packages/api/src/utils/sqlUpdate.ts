/**
 * Construit un UPDATE à partir des seules clés réellement présentes dans le body.
 * Remplace le motif `COALESCE($1, col)`, qui rend impossible la remise à NULL
 * (dépingler un album, effacer une légende…).
 */
export function buildUpdate(
  table: string,
  data: Record<string, unknown>,
  columns: Record<string, string>,
  id: string,
): { text: string; params: unknown[] } | null {
  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, column] of Object.entries(columns)) {
    if (!(key in data)) continue;
    params.push(data[key]);
    sets.push(`${column} = $${params.length}`);
  }

  if (sets.length === 0) return null;

  params.push(id);
  return {
    text: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  };
}
