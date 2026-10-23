'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, UserPlus, X } from 'lucide-react';
import type { PublicUser } from '@/lib/owners';
import { displayName } from '@/lib/format';
import { Avatar } from './Avatar';
import { useToast } from './Toaster';

function Person({ user, children }: { user: PublicUser; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link href={`/u/${encodeURIComponent(user.username)}`} className="flex items-center gap-3 min-w-0 flex-1 group">
        <Avatar user={user} size={38} />
        <span className="min-w-0">
          <span className="block font-bold text-[14px] truncate group-hover:text-[var(--color-violet-lift)]">{displayName(user)}</span>
          <span className="block text-[12px] dim truncate">@{user.username}</span>
        </span>
      </Link>
      {children}
    </div>
  );
}

export function FriendsPanel({ friends, incoming, outgoing }: { friends: PublicUser[]; incoming: PublicUser[]; outgoing: PublicUser[] }) {
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const call = async (method: 'POST' | 'DELETE', url: string, body?: unknown, success?: string) => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');
      toast(success ?? (data.state === 'friends' ? `You and ${displayName(data.user ?? null)} are friends now.` : 'Friend request sent.'), 'success');
      router.refresh();
      return true;
    } catch (error) {
      toast((error as Error).message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <form
        className="card corner p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (who.trim() && (await call('POST', '/api/friends', { who: who.trim() }))) setWho('');
        }}
      >
        <label className="field-label" htmlFor="friend-who">Add a friend</label>
        <div className="flex gap-2">
          <input id="friend-who" className="field" placeholder="Username or email" value={who} onChange={(e) => setWho(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn btn-primary shrink-0 !h-[44px]" disabled={busy || !who.trim()}>
            <UserPlus size={16} /> Add
          </button>
        </div>
        <p className="field-note">Your Serika friends, the same ones as on SerikaCord, are already here.</p>
      </form>

      {incoming.length > 0 && (
        <section className="card p-5">
          <p className="eyebrow">Requests · {incoming.length}</p>
          <div className="mt-2 divide-y divide-[var(--color-line)]">
            {incoming.map((u) => (
              <Person key={u.id} user={u}>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call('POST', `/api/friends/${u.id}`, undefined, `You and ${displayName(u)} are friends now.`)}>
                  <Check size={14} /> Accept
                </button>
                <button type="button" className="btn btn-bare btn-icon" aria-label="Decline" disabled={busy} onClick={() => call('DELETE', `/api/friends/${u.id}`, undefined, 'Request declined.')}>
                  <X size={16} />
                </button>
              </Person>
            ))}
          </div>
        </section>
      )}

      <section className="card p-5">
        <p className="eyebrow">Friends · {friends.length}</p>
        {friends.length === 0 ? (
          <p className="text-[13.5px] muted mt-3">No friends yet. Add someone by username or email above.</p>
        ) : (
          <div className="mt-2 divide-y divide-[var(--color-line)] max-h-[420px] overflow-y-auto pr-1">
            {friends.map((u) => <Person key={u.id} user={u} />)}
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="card p-5">
          <p className="eyebrow">Sent · {outgoing.length}</p>
          <div className="mt-2 divide-y divide-[var(--color-line)]">
            {outgoing.map((u) => (
              <Person key={u.id} user={u}>
                <button type="button" className="btn btn-bare btn-sm" disabled={busy} onClick={() => call('DELETE', `/api/friends/${u.id}`, undefined, 'Request cancelled.')}>
                  Cancel
                </button>
              </Person>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
