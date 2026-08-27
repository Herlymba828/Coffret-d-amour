#!/usr/bin/env node
/**
 * Sauvegarde complète du coffret : base PostgreSQL + fichiers du bucket.
 *
 *   npm run backup              # dump SQL + médias dans ./backups/<horodatage>/
 *   npm run backup -- --db-only # base seule (rapide)
 *
 * Les photos et les messages sont la seule donnée irremplaçable du projet :
 * ce script est pensé pour tourner sans dépendance supplémentaire, aussi bien
 * en local (Postgres dans Docker) qu'en production (DATABASE_URL distante).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { run, hasCommand } from './lib/proc.mjs';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const args = process.argv.slice(2);
const dbOnly = args.includes('--db-only');
const keep = Number(readFlag('--keep') ?? 7);

function readFlag(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

/**
 * pg_dump n'est presque jamais installé sur une machine de dev Windows :
 * on passe par le conteneur Docker quand il est disponible.
 */
async function dumpDatabase(target) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL absent du .env');

  if (await hasCommand('pg_dump')) {
    console.log('  → pg_dump local');
    await run('pg_dump', ['--no-owner', '--no-acl', databaseUrl], { outFile: target });
  } else {
    console.log('  → pg_dump via le conteneur Docker');
    const url = new URL(databaseUrl);
    const database = url.pathname.replace(/^\//, '');
    await run(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'pg_dump', '--no-owner', '--no-acl', '-U', url.username, database],
      { cwd: rootDir, outFile: target },
    );
  }

  const { size } = fs.statSync(target);
  if (size === 0) throw new Error('Le dump est vide — sauvegarde considérée comme échouée');
  return size;
}

async function dumpMedia(targetDir) {
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

  let token;
  let count = 0;
  let bytes = 0;

  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }));
    for (const object of page.Contents ?? []) {
      const destination = path.join(targetDir, object.Key);
      fs.mkdirSync(path.dirname(destination), { recursive: true });

      const body = await s3.send(new GetObjectCommand({ Bucket, Key: object.Key }));
      fs.writeFileSync(destination, Buffer.from(await body.Body.transformToByteArray()));

      count += 1;
      bytes += object.Size ?? 0;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return { count, bytes };
}

function prune(backupsDir) {
  const entries = fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}T/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const stale of entries.slice(keep)) {
    fs.rmSync(path.join(backupsDir, stale), { recursive: true, force: true });
    console.log(`  → purge de ${stale}`);
  }
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupsDir = path.join(rootDir, 'backups');
  const targetDir = path.join(backupsDir, stamp);
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`Sauvegarde → backups/${stamp}`);

  const sqlPath = path.join(targetDir, 'database.sql');
  let size;
  try {
    size = await dumpDatabase(sqlPath);
  } catch (err) {
    // Ne pas laisser derrière soi un dossier de sauvegarde vide, qui donnerait
    // l'illusion d'une sauvegarde réussie.
    fs.rmSync(targetDir, { recursive: true, force: true });
    throw err;
  }
  console.log(`  ✓ base de données (${human(size)})`);

  if (dbOnly) {
    console.log('  · médias ignorés (--db-only)');
  } else {
    try {
      const { count, bytes } = await dumpMedia(path.join(targetDir, 'media'));
      console.log(`  ✓ médias : ${count} fichier(s) (${human(bytes)})`);
    } catch (err) {
      // Une base sauvegardée sans les médias vaut mieux que rien du tout.
      console.warn(`  ! médias non sauvegardés : ${err.message}`);
    }
  }

  prune(backupsDir);
  console.log(`\nTerminé. Restauration : npm run restore -- backups/${stamp}`);
}

main().catch((err) => {
  console.error(`\nSauvegarde échouée : ${err.message}`);
  process.exit(1);
});
