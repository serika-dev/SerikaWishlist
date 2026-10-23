import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomToken } from './tokens';

/**
 * Image uploads (list icons, product photos) go to serika-accounts' Backblaze
 * B2 bucket under wishlist/, through its S3 API, and are served from the
 * bucket's public URL exactly like account avatars are.
 */

const B2 = {
  keyId: process.env.B2_KEY_ID || '',
  appKey: process.env.B2_APP_KEY || '',
  bucket: process.env.B2_BUCKET_NAME || '',
  endpoint: (process.env.B2_ENDPOINT || '').replace(/^https?:\/\//, ''),
  region: process.env.B2_REGION || 'eu-central-003',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

let client: S3Client | null = null;

export function storageConfigured(): boolean {
  return Boolean(B2.keyId && B2.appKey && B2.bucket && B2.endpoint);
}

function s3(): S3Client {
  client ??= new S3Client({
    region: B2.region,
    endpoint: `https://${B2.endpoint}`,
    credentials: { accessKeyId: B2.keyId, secretAccessKey: B2.appKey },
  });
  return client;
}

/** Public URL prefix of our uploads; used to tell our images from anyone's. */
export function uploadPrefix(): string {
  return `https://${B2.bucket}.${B2.endpoint}/wishlist/`;
}

export function isOurUpload(url: string | null | undefined): boolean {
  return Boolean(url && storageConfigured() && url.startsWith(uploadPrefix()));
}

/**
 * The real type of an image from its first bytes. The browser-reported type
 * is never trusted, so a renamed HTML or SVG file cannot be served as an image.
 */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { type: 'image/gif', ext: 'gif' };
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return { type: 'image/webp', ext: 'webp' };
  }
  return null;
}

export async function uploadImage(bytes: Uint8Array, folder: 'icons' | 'items'): Promise<string> {
  const kind = sniffImage(bytes);
  if (!kind) throw new Error('That file is not a JPEG, PNG, GIF or WebP image.');
  const now = new Date();
  const key = `wishlist/${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomToken(15)}.${kind.ext}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: B2.bucket,
      Key: key,
      Body: bytes,
      ContentType: kind.type,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return `https://${B2.bucket}.${B2.endpoint}/${key}`;
}
