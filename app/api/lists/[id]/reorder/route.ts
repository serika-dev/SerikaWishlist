import { fail, handler, ok, readJson } from '@/lib/api';
import { reorderItems } from '@/lib/lists';
import { requireEditableList } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireEditableList(id);
  const body = await readJson<{ ids?: unknown }>(request);
  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === 'string').slice(0, 1000) : [];
  if (ids.length === 0) return fail('Nothing to reorder.');
  await reorderItems(id, ids);
  return ok({ success: true });
});
