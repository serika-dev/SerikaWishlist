import { fail, handler, ok, optionalEnum, readJson } from '@/lib/api';
import { deleteList, updateList } from '@/lib/lists';
import { VISIBILITIES } from '@/lib/types';
import { requireEditableList } from '@/lib/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const { list: current } = await requireEditableList(id);
  const body = await readJson(request);
  const visibility = optionalEnum(body.visibility, VISIBILITIES, 'Visibility');
  if ((visibility === 'public' || visibility === 'friends') && !current.ownerUserId) {
    return fail('Public and friends-only lists need a Serika account. Link-only sharing works the same.');
  }
  const list = await updateList(id, {
    title: typeof body.title === 'string' ? body.title : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    emoji: typeof body.emoji === 'string' ? body.emoji : undefined,
    visibility,
    showReservations: typeof body.showReservations === 'boolean' ? body.showReservations : undefined,
  });
  return ok({ list });
});

export const DELETE = handler(async (_request: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireEditableList(id);
  await deleteList(id);
  return ok({ success: true });
});
