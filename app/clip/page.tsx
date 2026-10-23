import type { Metadata } from 'next';
import { ClipApp } from '@/components/ClipApp';
import { cleanUrl } from '@/lib/lists';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add to wishlist', robots: { index: false } };

/** The bookmarklet's popup window. No site chrome: it is 480px wide. */
export default async function ClipPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  return <ClipApp fallbackUrl={cleanUrl(u)} />;
}
