import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { config } from '../config.js';

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: true,
});

let bucketReady: Promise<void> | null = null;

export async function ensureBucket(): Promise<void> {
  // Mémoïsé sur la promesse : sans ça, N requêtes concurrentes déclenchent
  // N HeadBucket au démarrage.
  bucketReady ??= (async () => {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
    }
  })().catch((err) => {
    bucketReady = null;
    throw err;
  });

  return bucketReady;
}

const READ_URL_TTL = 900;
/** Marge de sécurité : on ne ressert jamais une URL sur le point d'expirer. */
const READ_URL_CACHE_TTL = (READ_URL_TTL - 120) * 1000;

const readUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function clearReadUrlCache() {
  readUrlCache.clear();
}

export async function getUploadUrl(key: string, mimeType: string, expiresIn = 3600): Promise<string> {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Signer une URL coûte un HMAC + une sérialisation complète de la requête.
 * Afficher un album de 20 photos en demandait 40 à chaque ouverture, pour un
 * résultat identique pendant 15 minutes : on les garde en mémoire.
 */
export async function getReadUrl(key: string, expiresIn = READ_URL_TTL): Promise<string> {
  const cacheable = expiresIn === READ_URL_TTL;
  const now = Date.now();

  if (cacheable) {
    const hit = readUrlCache.get(key);
    if (hit && hit.expiresAt > now) return hit.url;
  }

  await ensureBucket();
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }), {
    expiresIn,
  });

  if (cacheable) {
    readUrlCache.set(key, { url, expiresAt: now + READ_URL_CACHE_TTL });

    // Purge opportuniste : le cache suit le nombre de médias, pas le trafic.
    if (readUrlCache.size > 500) {
      for (const [cachedKey, entry] of readUrlCache) {
        if (entry.expiresAt <= now) readUrlCache.delete(cachedKey);
      }
    }
  }

  return url;
}

export async function objectExists(key: string): Promise<boolean> {
  await ensureBucket();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  await ensureBucket();
  const result = await s3.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
  return Buffer.from(await result.Body!.transformToByteArray());
}

export async function putObject(key: string, body: Buffer, mimeType: string): Promise<void> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({ Bucket: config.s3.bucket, Key: key, Body: body, ContentType: mimeType }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await ensureBucket();
  await s3.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
  readUrlCache.delete(key);
}

export function buildStorageKey(userId: string, filename: string): string {
  // path.extname sur le seul basename : un nom piégé ("../../x") ne peut pas
  // remonter dans l'arborescence du bucket.
  const ext = path.extname(path.basename(filename)).replace(/[^.\w]/g, '').slice(0, 10) || '.bin';
  return `photos/${userId}/${randomUUID()}${ext}`;
}

/** Clé de la miniature dérivée de celle de l'original. */
export function buildThumbnailKey(storageKey: string): string {
  const ext = path.extname(storageKey);
  return `${storageKey.slice(0, -ext.length || undefined)}_thumb.webp`;
}
