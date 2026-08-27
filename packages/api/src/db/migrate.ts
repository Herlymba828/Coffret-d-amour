import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schemaPath = path.resolve(__dirname, '../../../../docs/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Applying database schema…');

  // Le schéma est idempotent (IF NOT EXISTS / ON CONFLICT) mais reste appliqué
  // en transaction : un échec à mi-parcours ne laisse pas la base à moitié créée.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
