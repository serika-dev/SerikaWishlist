import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';
import { safeReturnPath } from '@/lib/return-path';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string; moved?: string }> }) {
  const { next, email, moved } = await searchParams;
  const nextPath = safeReturnPath(next ?? '/lists');
  if (await getSessionUser()) redirect(nextPath);
  return (
    <LoginForm
      nextPath={nextPath}
      defaultEmail={typeof email === 'string' ? email.slice(0, 320) : ''}
      notice={moved ? 'Your wishlists are waiting in your Serika account.' : undefined}
    />
  );
}
