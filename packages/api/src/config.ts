import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PLACEHOLDER_SECRET = 'change-me-to-a-random-string-at-least-32-chars';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = required('JWT_SECRET');

if (jwtSecret === PLACEHOLDER_SECRET || jwtSecret.length < 32) {
  const message =
    'JWT_SECRET est le placeholder de .env.example ou fait moins de 32 caractères. ' +
    'Génère-en un avec: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"';
  if (nodeEnv === 'production') throw new Error(message);
  console.warn(`⚠️  ${message}`);
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv,
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  sharedCode: process.env.SHARED_CODE ?? '14-02-2020-Marie',
  sharedPassword: process.env.SHARED_PASSWORD ?? 'notre-coffret',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.S3_BUCKET ?? 'coffret-amour',
    region: process.env.S3_REGION ?? 'auto',
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/coffret-amour',
  },
  couple: {
    welcomePhrase: process.env.COUPLE_WELCOME_PHRASE ?? 'Bienvenue dans notre coffret, mon amour…',
    relationshipStart: process.env.COUPLE_RELATIONSHIP_START ?? '2020-02-14',
    anniversaryDate: process.env.COUPLE_ANNIVERSARY_DATE ?? '2026-07-14',
    midnightMessage: process.env.COUPLE_MIDNIGHT_MESSAGE ?? 'Chaque message ici est une promesse…',
  },
};
