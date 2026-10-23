import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AccessForm } from '@/components/AccessForm';
import { listsForViewer } from '@/lib/lists';
import { safeReturnPath } from '@/lib/return-path';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Save with email' };

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeReturnPath((await searchParams).next ?? '/lists');
  const viewer = await getViewer();
  if (viewer.user) redirect(nextPath);
  const guest = viewer.guest && !viewer.guest.claimedUserId ? viewer.guest : null;
  const hasUnsavedLists = Boolean(guest && !guest.email && (await listsForViewer(viewer)).length > 0);
  if (guest?.email) redirect(nextPath);
  return <AccessForm hasUnsavedLists={hasUnsavedLists} pendingEmail={guest?.pendingEmail ?? null} nextPath={nextPath} />;
}
