import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { RegisterForm } from '@/components/RegisterForm';
import { safeReturnPath } from '@/lib/return-path';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeReturnPath((await searchParams).next ?? '/lists');
  if (await getSessionUser()) redirect(nextPath);
  return <RegisterForm nextPath={nextPath} />;
}
