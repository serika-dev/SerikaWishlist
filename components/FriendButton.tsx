'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Clock, UserMinus, UserPlus } from 'lucide-react';
import type { FriendState } from '@/lib/friends';
import { useToast } from './Toaster';

export function FriendButton({ userId, initial, name }: { userId: string; initial: FriendState; name: string }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const call = async (method: 'POST' | 'DELETE', url: string, body?: unknown) => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');
      setState(data.state);
      if (data.state === 'friends') toast(`You and ${name} are friends.`, 'success');
      if (data.state === 'outgoing') toast(`Friend request sent to ${name}.`, 'success');
      router.refresh();
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'self') return null;
  if (state === 'friends')
    return (
      <button type="button" className="btn btn-ghost btn-sm group" disabled={busy} onClick={() => call('DELETE', `/api/friends/${userId}`)}>
        <Check size={15} className="group-hover:hidden" /><UserMinus size={15} className="hidden group-hover:block" />
        <span className="group-hover:hidden">Friends</span><span className="hidden group-hover:inline">Unfriend</span>
      </button>
    );
  if (state === 'outgoing')
    return (
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => call('DELETE', `/api/friends/${userId}`)}>
        <Clock size={15} /> Requested · Cancel
      </button>
    );
  if (state === 'incoming')
    return (
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call('POST', `/api/friends/${userId}`)}>
        <UserPlus size={15} /> Accept request
      </button>
    );
  return (
    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call('POST', '/api/friends', { id: userId, who: userId })}>
      <UserPlus size={15} /> Add friend
    </button>
  );
}
