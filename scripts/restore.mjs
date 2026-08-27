#!/usr/bin/env node
/**
 * Restauration d'une sauvegarde produite par scripts/backup.mjs.
 *
 *   npm run restore -- backups/2026-08-27T09-12-33-000Z
 *   npm run restore -- backups/<dossier> --yes    # sans confirmation
 *
 * L'opération ÉCRASE la base pointée par DATABASE_URL : elle demande une
 * confirmation explicite, et refuse de tourner en production sans --yes.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { run, hasCommand } from './lib/proc.mjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const args = process.argv.slice(2);
const assumeYes = args.includes('--yes');
const source = args.find((arg) => !arg.startsWith('--'));

async function confirm(target) {
  if (assumeYes) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Cette opération écrase le contenu de ${target}.\nTaper "restaurer" pour continuer : `,
  );
  rl.close();
  return answer.trim() === 'restaurer';
}

async function restoreDatabase(sqlPath) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL absent du .env');

  if (await hasCommand('psql')) {
    await run('psql', ['--set', 'ON_ERROR_STOP=1', databaseUrl], { inFile: sqlPath });
  } else {
    const url = new URL(databaseUrl);
    const database = url.pathname.replace(/^\//, '');
    await run(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'psql', '--set', 'ON_ERROR_STOP=1', '-U', url.username, database],
      { cwd: rootDir, inFile: sqlPath },
    );
  }
}

async function restoreMedia(mediaDir) {
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    },
    forcePathStyle: true,
  });
  const Bucket = process.env.S3_BUCKET ?? 'coffret-amour';

  let count = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  const files = [];
  walk(mediaDir);

  for (const file of files) {
    const key = path.relative(mediaDir, file).split(path.sep).join('/');
    await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: fs.readFileSync(file) }));
    count += 1;
  }
  return count;
}

async function main() {
  if (!source) throw new Error('Indiquer le dossier de sauvegarde : npm run restore -- backups/<dossier>');

  const dir = path.resolve(rootDir, source);
  const sqlPath = path.join(dir, 'database.sql');
  if (!fs.existsSync(sqlPath)) throw new Error(`Sauvegarde introuvable : ${sqlPath}`);

  if (process.env.NODE_ENV === 'production' && !assumeYes) {
    throw new Error('Restauration en production : relancer explicitement avec --yes');
  }

  const target = new URL(process.env.DATABASE_URL ?? 'postgresql://inconnu/inconnu').host;
  if (!(await confirm(target))) {
    console.log('Annulé.');
    return;
  }

  console.log('Restauration de la base…');
  await restoreDatabase(sqlPath);
  console.log('  ✓ base restaurée');

  const mediaDir = path.join(dir, 'media');
  if (fs.existsSync(mediaDir)) {
    const count = await restoreMedia(mediaDir);
    console.log(`  ✓ ${count} média(s) renvoyé(s) dans le bucket`);
  }

  console.log('\nRestauration terminée.');
}

main().catch((err) => {
  console.error(`\nRestauration échouée : ${err.message}`);
  process.exit(1);
});
