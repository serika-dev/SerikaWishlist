'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { safeReturnPath } from '@/lib/return-path';
import { AccountsAuthShell, AuthHeader, FormAlert } from './AccountsAuthShell';

export function RegisterForm({ nextPath = '/lists' }: { nextPath?: string }) {
  const loginUrl = `/login?${new URLSearchParams({ next: safeReturnPath(nextPath) })}`;
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not create your account.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AccountsAuthShell>
        <AuthHeader icon={<MailCheck size={40} />} title="Check your email" subtitle={<>We sent a verification link to <b className="text-white">{email}</b>.</>} />
        <p className="text-[0.88rem] text-[var(--color-text-muted)] text-center mb-6">
          Once it&apos;s confirmed, sign in here. Wishlists you saved as a guest with this address move into your account automatically.
        </p>
        <Link href={loginUrl} className="sk-btn sk-btn-primary no-underline!">Sign in</Link>
      </AccountsAuthShell>
    );
  }

  return (
    <AccountsAuthShell>
      <AuthHeader title="Create Account" subtitle="One Serika account for every Serika product" />
      <form onSubmit={submit} className="accounts-form" aria-busy={busy}>
        {error && <FormAlert>{error}</FormAlert>}
        <div>
          <label className="sk-label" htmlFor="username">Username</label>
          <input id="username" className="sk-input" autoComplete="username" placeholder="serika" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={32} required disabled={busy} />
        </div>
        <div>
          <label className="sk-label" htmlFor="email">Email Address</label>
          <input id="email" type="email" className="sk-input" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
        </div>
        <div>
          <label className="sk-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="sk-input" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required disabled={busy} />
        </div>
        <button type="submit" className="sk-btn sk-btn-primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="accounts-footnote">
        Already have an account? <Link href={loginUrl}>Sign in</Link>
      </p>
    </AccountsAuthShell>
  );
}
