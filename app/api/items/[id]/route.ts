import { handler, ok, readJson } from '@/lib/api';
import { AuthError } from '@/lib/errors';
import { canEdit, deleteItem, getItem, updateItem } from '@/lib/lists';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function requireEditableItem(id: string) {
  const [item, viewer] = await Promise.all([getItem(id), getViewer()]);
  if (!item) throw new AuthError('That item does not exist.', 404);
  if (!canEdit(item.list, viewer)) throw new AuthError('Only the owner can change this item.', 403);
  return item;
}

export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireEditableItem(id);
  const body = await readJson(request);
  const item = await updateItem(id, {
    title: body.title as string | undefined,
    variant: body.variant as string | undefined,
    url: body.url as string | undefined,
    imageUrl: body.imageUrl as string | undefined,
    price: body.price as number | undefined,
    currency: body.currency as string | undefined,
    store: body.store as string | undefined,
    note: body.note as string | undefined,
    quantity: body.quantity as number | undefined,
    priority: body.priority as number | undefined,
    received: typeof body.received === 'boolean' ? body.received : undefined,
  });
  return ok({ item });
});

export const DELETE = handler(async (_request: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireEditableItem(id);
  await deleteItem(id);
  return ok({ success: true });
});
