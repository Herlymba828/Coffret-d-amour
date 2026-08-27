import sharp from 'sharp';
import { buildThumbnailKey, getObjectBuffer, putObject } from './storage.js';

/** Largeur suffisante pour une grille 3 colonnes en écran Retina. */
const THUMBNAIL_WIDTH = 480;

export interface MediaDerivatives {
  thumbnailKey: string | null;
  width: number | null;
  height: number | null;
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Génère la miniature d'un média déjà présent dans le bucket et renvoie ses
 * dimensions d'origine.
 *
 * La galerie servait jusqu'ici les originaux (3 à 5 Mo par photo de téléphone)
 * pour des vignettes de 120 px. Les dimensions sont conservées en base pour que
 * le front réserve la place de l'image avant son chargement.
 */
export async function generateDerivatives(
  storageKey: string,
  mimeType: string,
): Promise<MediaDerivatives> {
  if (!isImage(mimeType)) return { thumbnailKey: null, width: null, height: null };

  const original = await getObjectBuffer(storageKey);
  // failOn: 'none' — une photo légèrement corrompue reste affichable, on ne
  // veut pas faire échouer l'upload pour ça.
  const image = sharp(original, { failOn: 'none' });
  const metadata = await image.metadata();

  const thumbnail = await image
    .rotate() // applique l'orientation EXIF, sinon les photos portrait sortent couchées
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnailKey = buildThumbnailKey(storageKey);
  await putObject(thumbnailKey, thumbnail, 'image/webp');

  // Après rotation EXIF, largeur et hauteur peuvent être inversées.
  const rotated = metadata.orientation !== undefined && metadata.orientation >= 5;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;

  return {
    thumbnailKey,
    width: width ?? null,
    height: height ?? null,
  };
}
