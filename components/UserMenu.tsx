'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, List, LogOut, Mail, User as UserIcon } from 'lucide-react';
import type { Guest, SessionUser } from '@/lib/types';
import { displayName } from '@/lib/format';
import { Avatar } from './Avatar';
import { useToast } from './Toaster';

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function UserMenu({ user, guest }: { user: SessionUser | null; guest: Guest | null }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const router = useRouter();
  const { toast } = useToast();

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setOpen(false);
    toast(user ? 'Signed out.' : 'This device is forgotten.', 'success');
    router.push('/');
    router.refresh();
  };

  if (user) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Account menu"
          className="flex items-center gap-2.5 rounded-full p-0.5 pr-0.5 hover:ring-2 hover:ring-[var(--color-violet)]/50 transition"
        >
          <Avatar user={user} size={34} />
        </button>
        {open && (
          <div className="menu right-0 top-[calc(100%+10px)]" role="menu">
            <div className="px-3 pt-2 pb-3 mb-1 border-b border-[var(--color-line)]">
              <p className="font-bold leading-tight">{displayName(user)}</p>
              <p className="text-[12px] dim">@{user.username}</p>
            </div>
            <Link href="/lists" className="menu-item" onClick={() => setOpen(false)}>
              <List /> My wishlists
            </Link>
            <Link href={`/u/${encodeURIComponent(user.username)}`} className="menu-item" onClick={() => setOpen(false)}>
              <UserIcon /> My public page
            </Link>
            <a href="https://accounts.serika.dev/account" target="_blank" rel="noreferrer" className="menu-item">
              <ExternalLink /> Serika account
            </a>
            <button type="button" className="menu-item" onClick={signOut}>
              <LogOut /> Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  if (guest) {
    return (
      <div ref={ref} className="relative flex items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn btn-ghost btn-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: guest.email ? 'var(--color-ok)' : 'var(--color-warn)' }} />
          Guest
        </button>
        {open && (
          <div className="menu right-0 top-[calc(100%+10px)] w-[270px]" role="menu">
            <div className="px-3 pt-2 pb-3 mb-1 border-b border-[var(--color-line)]">
              <p className="font-bold leading-tight">Guest wishlists</p>
              <p className="text-[12px] dim mt-0.5 break-all">
                {guest.email ? `Saved to ${guest.email}` : guest.pendingEmail ? `Link sent to ${guest.pendingEmail}` : 'Only on this device until you add an email'}
              </p>
            </div>
            <Link href="/lists" className="menu-item" onClick={() => setOpen(false)}>
              <List /> My wishlists
            </Link>
            {!guest.email && (
              <Link href="/access" className="menu-item" onClick={() => setOpen(false)}>
                <Mail /> Save with my email
              </Link>
            )}
            <Link href="/login" className="menu-item" onClick={() => setOpen(false)}>
              <UserIcon /> Sign in with Serika
            </Link>
            <button type="button" className="menu-item" onClick={signOut}>
              <LogOut /> Forget this device
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href="/login" className="btn btn-ghost btn-sm">
      Sign in
    </Link>
  );
}
