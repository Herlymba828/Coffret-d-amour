import { describe, it, expect, beforeEach, vi } from 'vitest';
import sharp from 'sharp';

const { mockGetObjectBuffer, mockPutObject } = vi.hoisted(() => ({
  mockGetObjectBuffer: vi.fn(),
  mockPutObject: vi.fn(async () => {}),
}));

vi.mock('../services/storage.js', async (importOriginal) => {
  // buildThumbnailKey reste la vraie implémentation : c'est elle qu'on veut vérifier.
  const actual = await importOriginal<typeof import('../services/storage.js')>();
  return { ...actual, getObjectBuffer: mockGetObjectBuffer, putObject: mockPutObject };
});

const { generateDerivatives, isImage } = await import('../services/thumbnails.js');

/** Photo de test : 1600x900, plus large que la miniature cible. */
async function makePhoto(width = 1600, height = 900) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 90 } },
  })
    .jpeg()
    .toBuffer();
}

beforeEach(() => {
  mockGetObjectBuffer.mockReset();
  mockPutObject.mockClear();
});

describe('generateDerivatives', () => {
  it('produit une miniature webp et remonte les dimensions d’origine', async () => {
    mockGetObjectBuffer.mockResolvedValue(await makePhoto());

    const result = await generateDerivatives('photos/u1/abc.jpg', 'image/jpeg');

    expect(result).toEqual({ thumbnailKey: 'photos/u1/abc_thumb.webp', width: 1600, height: 900 });
    expect(mockPutObject).toHaveBeenCalledTimes(1);

    const [key, buffer, mime] = mockPutObject.mock.calls[0];
    expect(key).toBe('photos/u1/abc_thumb.webp');
    expect(mime).toBe('image/webp');

    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(480);
  });

  it('allège massivement le fichier servi à la galerie', async () => {
    const original = await makePhoto(3000, 2000);
    mockGetObjectBuffer.mockResolvedValue(original);

    await generateDerivatives('photos/u1/grande.jpg', 'image/jpeg');
    const [, thumbnail] = mockPutObject.mock.calls[0];

    expect(thumbnail.length).toBeLessThan(original.length / 4);
  });

  it('n’agrandit pas une image déjà plus petite que la cible', async () => {
    mockGetObjectBuffer.mockResolvedValue(await makePhoto(200, 150));

    const result = await generateDerivatives('photos/u1/petite.jpg', 'image/jpeg');
    const [, thumbnail] = mockPutObject.mock.calls[0];

    expect(result.width).toBe(200);
    expect((await sharp(thumbnail).metadata()).width).toBe(200);
  });

  it('ignore les médias non-image sans rien téléverser', async () => {
    const result = await generateDerivatives('photos/u1/clip.mp4', 'video/mp4');

    expect(result).toEqual({ thumbnailKey: null, width: null, height: null });
    expect(mockGetObjectBuffer).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it('remonte l’erreur si le fichier est illisible (l’appelant décide)', async () => {
    mockGetObjectBuffer.mockResolvedValue(Buffer.from('ceci n’est pas une image'));
    await expect(generateDerivatives('photos/u1/casse.jpg', 'image/jpeg')).rejects.toThrow();
  });
});

describe('isImage', () => {
  it('distingue images et autres médias', () => {
    expect(isImage('image/jpeg')).toBe(true);
    expect(isImage('image/webp')).toBe(true);
    expect(isImage('video/mp4')).toBe(false);
    expect(isImage('application/pdf')).toBe(false);
  });
});
