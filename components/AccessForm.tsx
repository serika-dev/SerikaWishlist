'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, MailCheck } from 'lucide-react';
import { AccountsAuthShell, AuthHeader, FormAlert } from './AccountsAuthShell';

/**
 * Guest access by email: save this browser's lists to an address, or get a
 * fresh edit link for lists saved before. No password, ever.
 */
export function AccessForm({
  hasUnsavedLists,
  pendingEmail,
  nextPath,
}: {
  hasUnsavedLists: boolean;
  pendingEmail: string | null;
  nextPath: string;
}) {
  const [email, setEmail] = useState(pendingEmail || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo: nextPath }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not send the link.');
        return;
      }
      setSentTo(email.trim().toLowerCase());
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AccountsAuthShell>
        <AuthHeader icon={<MailCheck size={40} />} title="Check your inbox" subtitle={<>We sent a link to <b className="text-white break-all">{sentTo}</b></>} />
        <p className="text-[0.88rem] text-[var(--color-text-muted)] text-center leading-relaxed">
          Open it on any device to {hasUnsavedLists ? 'confirm your wishlist is saved and keep editing' : 'edit your wishlists'}. It works once and expires in 24 hours; after that you stay signed in on that device for 30 days.
        </p>
        <p className="accounts-footnote">
          Nothing there? Check spam, or <button type="button" className="text-[var(--color-primary)] font-semibold hover:underline" onClick={() => setSentTo('')}>try another address</button>.
        </p>
      </AccountsAuthShell>
    );
  }

  return (
    <AccountsAuthShell>
      <AuthHeader
        icon={<Mail size={36} />}
        title={hasUnsavedLists ? 'Save Your Wishlist' : 'Your Wishlists'}
        subtitle={
          hasUnsavedLists
            ? 'Add your email and we’ll send a link to edit it from anywhere.'
            : 'Made a wishlist without an account? We’ll email you a link back in.'
        }
      />
      <form onSubmit={submit} className="accounts-form" aria-busy={busy}>
        {error && <FormAlert>{error}</FormAlert>}
        {pendingEmail && !error && (
          <FormAlert tone="ok">We already sent a link to {pendingEmail}. Need another one? Send it again below.</FormAlert>
        )}
        <div>
          <label className="sk-label" htmlFor="email">Email Address</label>
          <input id="email" type="email" className="sk-input" placeholder="name@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} autoFocus />
        </div>
        <button type="submit" className="sk-btn sk-btn-primary" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a magic link'}
        </button>
      </form>
      <p className="text-[0.78rem] text-[var(--color-text-dim)] text-center mt-4 leading-relaxed">
        Make a Serika account with the same address later and your wishlists move into it automatically.
      </p>
      <div className="accounts-divider">or</div>
      <Link href={`/login?${new URLSearchParams({ next: nextPath })}`} className="sk-btn sk-btn-secondary no-underline!">
        Sign in with Serika
      </Link>
    </AccountsAuthShell>
  );
}
