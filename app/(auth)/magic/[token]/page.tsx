import type { Metadata } from 'next';
import { MagicLanding } from '@/components/MagicLanding';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Magic link', robots: { index: false } };

export default async function MagicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <MagicLanding token={token} />;
}
