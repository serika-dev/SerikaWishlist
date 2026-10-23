import Link from 'next/link';
import { MailWarning, MailCheck } from 'lucide-react';
import type { Guest } from '@/lib/types';

/** Reminds guests that unsaved lists live only in this browser. */
export function GuestBanner({ guest, returnTo = '/lists' }: { guest: Guest; returnTo?: string }) {
  if (guest.email) {
    return (
      <div className="card px-4 py-3 flex items-center gap-3 text-[13.5px]">
        <MailCheck size={18} className="text-[var(--color-ok)] shrink-0" />
        <p className="muted min-w-0">
          Saved to <b className="text-white break-all">{guest.email}</b>. Make a{' '}
          <Link href="/register" className="text-[var(--color-violet-lift)] font-semibold hover:underline">Serika account</Link> with this address to keep everything in one place.
        </p>
      </div>
    );
  }
  return (
    <div className="card corner px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 border-[var(--color-warn)]/25 bg-[linear-gradient(90deg,rgba(251,191,36,0.07),transparent)]">
      <MailWarning size={22} className="text-[var(--color-warn)] shrink-0 hidden sm:block" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{guest.pendingEmail ? 'Check your inbox to finish saving' : 'Only on this device for now'}</p>
        <p className="text-[13px] muted mt-0.5">
          {guest.pendingEmail
            ? <>We sent a magic link to <b className="text-white break-all">{guest.pendingEmail}</b>. Open it to save your wishlists for good.</>
            : 'Add your email to save your wishlists and edit them from anywhere. No password needed.'}
        </p>
      </div>
      <Link href={`/access?${new URLSearchParams({ next: returnTo })}`} className="btn btn-primary btn-sm shrink-0">
        {guest.pendingEmail ? 'Resend link' : 'Save with email'}
      </Link>
    </div>
  );
}
