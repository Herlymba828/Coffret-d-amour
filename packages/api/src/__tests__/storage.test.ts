import { describe, it, expect, beforeEach, vi } from 'vitest';

const { signCount, mockGetSignedUrl } = vi.hoisted(() => {
  const signCount = { value: 0 };
  return {
    signCount,
    mockGetSignedUrl: vi.fn(async (_client: unknown, command: { input: { Key: string } }) => {
      signCount.value += 1;
      return `https://bucket.test/${command.input.Key}?signature=${signCount.value}`;
    }),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: mockGetSignedUrl }));

vi.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(readonly input: Record<string, unknown>) {}
  }
  return {
    S3Client: class {
      async send() {
        return {};
      }
    },
    GetObjectCommand: Command,
    PutObjectCommand: Command,
    DeleteObjectCommand: Command,
    HeadObjectCommand: Command,
    HeadBucketCommand: Command,
    CreateBucketCommand: Command,
  };
});

const { getReadUrl, getUploadUrl, clearReadUrlCache, buildThumbnailKey } = await import(
  '../services/storage.js'
);

beforeEach(() => {
  clearReadUrlCache();
  signCount.value = 0;
  mockGetSignedUrl.mockClear();
});

describe('cache des URL signées', () => {
  it('ne signe qu’une fois pour une même clé', async () => {
    const first = await getReadUrl('photos/u1/a.jpg');
    const second = await getReadUrl('photos/u1/a.jpg');

    expect(second).toBe(first);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('signe séparément chaque clé', async () => {
    const a = await getReadUrl('photos/u1/a.jpg');
    const b = await getReadUrl('photos/u1/b.jpg');

    expect(a).not.toBe(b);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
  });

  // Un album de 20 photos demandait 40 signatures à chaque ouverture.
  it('sert 40 URL d’album avec 40 signatures la première fois, 0 ensuite', async () => {
    const keys = Array.from({ length: 20 }, (_, i) => [`photos/u1/${i}.jpg`, `photos/u1/${i}_thumb.webp`]).flat();

    await Promise.all(keys.map((key) => getReadUrl(key)));
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(40);

    mockGetSignedUrl.mockClear();
    await Promise.all(keys.map((key) => getReadUrl(key)));
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(0);
  });

  it('resigne après vidage du cache', async () => {
    const before = await getReadUrl('photos/u1/a.jpg');
    clearReadUrlCache();
    const after = await getReadUrl('photos/u1/a.jpg');

    expect(after).not.toBe(before);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('ne met pas en cache une durée de validité inhabituelle', async () => {
    await getReadUrl('photos/u1/a.jpg', 60);
    await getReadUrl('photos/u1/a.jpg', 60);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('ne met jamais en cache une URL d’upload', async () => {
    const first = await getUploadUrl('photos/u1/a.jpg', 'image/jpeg');
    const second = await getUploadUrl('photos/u1/a.jpg', 'image/jpeg');

    expect(second).not.toBe(first);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
  });
});

describe('buildThumbnailKey', () => {
  it('dérive la clé de la miniature de celle de l’original', () => {
    expect(buildThumbnailKey('photos/u1/abc.jpg')).toBe('photos/u1/abc_thumb.webp');
  });

  it('gère une clé sans extension', () => {
    expect(buildThumbnailKey('photos/u1/abc')).toBe('photos/u1/abc_thumb.webp');
  });
});
