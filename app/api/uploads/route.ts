import { clientIp, fail, handler, ok, rateLimited } from '@/lib/api';
import { MAX_UPLOAD_BYTES, storageConfigured, uploadImage } from '@/lib/storage';
import { getViewer, ownerOf } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Upload a list icon (?kind=icon) or product photo (?kind=item). Only people
 * who own lists here (an account or a guest session) may upload, and the
 * file's own bytes decide whether it is an image.
 */
export const POST = handler(async (request: Request) => {
  if (!storageConfigured()) return fail('Image uploads are not set up on this server.', 503);
  const viewer = await getViewer();
  const owner = ownerOf(viewer);
  if (!owner) return fail('Start a wishlist first, then add photos to it.', 401);

  const who = 'userId' in owner ? owner.userId : owner.guestId;
  if (rateLimited(`upload:${who}`, 60, 60 * 60 * 1000) || rateLimited(`upload-ip:${clientIp(request)}`, 80, 60 * 60 * 1000)) {
    return fail('That’s a lot of uploads. Try again in a little while.', 429);
  }

  const kind = new URL(request.url).searchParams.get('kind') === 'icon' ? 'icons' : 'items';
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return fail('Images can be up to 5 MB.', 413);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get('file');
    file = value instanceof File ? value : null;
  } catch {
    return fail('Send the image as form data in a field called “file”.');
  }
  if (!file || file.size === 0) return fail('Choose an image to upload.');
  if (file.size > MAX_UPLOAD_BYTES) return fail('Images can be up to 5 MB.', 413);

  try {
    const url = await uploadImage(new Uint8Array(await file.arrayBuffer()), kind);
    return ok({ url }, 201);
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith('That file')) return fail(message);
    console.error('[upload] failed:', error);
    return fail('The upload failed. Please try again.', 502);
  }
});
