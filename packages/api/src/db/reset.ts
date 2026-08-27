import { pool } from './pool.js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function reset() {
  console.log('Resetting database…');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.end();

  execSync('npm run db:migrate', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
  execSync('npm run db:seed', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
  console.log('Database reset complete.');
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
