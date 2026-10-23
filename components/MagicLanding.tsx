'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyRound, PartyPopper } from 'lucide-react';
import { AccountsAuthShell, AuthHeader, FormAlert } from './AccountsAuthShell';
import { useToast } from './Toaster';

/**
 * The page a magic link opens. Redeeming takes a click (a POST), so link
 * scanners in mail clients cannot spend the link before its owner does.
 */
export function MagicLanding({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [moved, setMoved] = useState<{ username: string; count: number; email: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const redeem = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'This link did not work.');
        return;
      }
      if (data.account) {
        setMoved({ username: data.account.username, count: data.moved, email: data.email });
        return;
      }
      toast(`You're in. Wishlists saved to ${data.email}.`, 'success');
      router.replace(data.returnTo || '/lists');
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  if (moved) {
    return (
      <AccountsAuthShell>
        <AuthHeader
          icon={<PartyPopper size={40} />}
          title="Moved In"
          subtitle={<>{moved.email} belongs to <b className="text-white">@{moved.username}</b> on Serika.</>}
        />
        <p className="text-[0.88rem] text-[var(--color-text-muted)] text-center mb-6 leading-relaxed">
          {moved.count > 0
            ? `${moved.count} wishlist${moved.count === 1 ? '' : 's'} moved into that account.`
            : 'Your wishlists are in that account.'}{' '}
          Sign in to see and edit them.
        </p>
        <Link href={`/login?${new URLSearchParams({ next: '/lists', email: moved.email, moved: '1' })}`} className="sk-btn sk-btn-primary no-underline!">
          Sign in with Serika
        </Link>
      </AccountsAuthShell>
    );
  }

  return (
    <AccountsAuthShell>
      <AuthHeader icon={<KeyRound size={38} />} title="Your Magic Link" subtitle="One click and you’re back in your wishlists." />
      {error && <FormAlert>{error}</FormAlert>}
      <button type="button" className="sk-btn sk-btn-primary" onClick={redeem} disabled={busy}>
        {busy ? 'Opening…' : 'Open my wishlists'}
      </button>
      <p className="text-[0.78rem] text-[var(--color-text-dim)] text-center mt-4">
        This device stays signed in for 30 days.
      </p>
      {error && (
        <p className="accounts-footnote">
          <Link href="/access">Send me a new link</Link>
        </p>
      )}
    </AccountsAuthShell>
  );
}
