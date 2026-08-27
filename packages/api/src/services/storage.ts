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

export async function getUploadUrl(key: string, mimeType: string, expiresIn = 3600): Promise<string> {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getReadUrl(key: string, expiresIn = 900): Promise<string> {
  await ensureBucket();
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
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

export async function deleteObject(key: string): Promise<void> {
  await ensureBucket();
  await s3.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}

export function buildStorageKey(userId: string, filename: string): string {
  // path.extname sur le seul basename : un nom piégé ("../../x") ne peut pas
  // remonter dans l'arborescence du bucket.
  const ext = path.extname(path.basename(filename)).replace(/[^.\w]/g, '').slice(0, 10) || '.bin';
  return `photos/${userId}/${randomUUID()}${ext}`;
}
