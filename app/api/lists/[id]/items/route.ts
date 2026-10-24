import { fail, handler, ok, readJson } from '@/lib/api';
import { addItems, sanitizeDraft } from '@/lib/lists';
import type { ItemDraft } from '@/lib/types';
import { requireEditableList } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Add one item ({ item }) or several ({ items }). */
export const POST = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireEditableList(id);
  const body = await readJson<{ item?: Record<string, unknown>; items?: Record<string, unknown>[]; placement?: string }>(request);
  const raw = body.items ?? (body.item ? [body.item] : []);
  const drafts = raw
    .slice(0, 500)
    .map((entry) => sanitizeDraft(entry))
    .filter((d): d is ItemDraft => d !== null);
  if (drafts.length === 0) return fail('Give the item a name or a link.');
  try {
    const placement = body.placement === 'top' || body.placement === 'bottom' ? body.placement : body.items ? 'bottom' : 'top';
    const items = await addItems(id, drafts, { placement });
    return ok({ items }, 201);
  } catch (error) {
    return fail((error as Error).message);
  }
});
