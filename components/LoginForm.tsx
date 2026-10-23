'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { safeReturnPath } from '@/lib/return-path';
import { AccountsAuthShell, AuthHeader, FormAlert } from './AccountsAuthShell';
import { useToast } from './Toaster';

export function LoginForm({ nextPath = '/lists', notice, defaultEmail = '' }: { nextPath?: string; notice?: string; defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const next = safeReturnPath(nextPath);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode.trim() || undefined }),
      });
      const data = await response.json();
      if (data.code === 'TWO_FACTOR_REQUIRED') {
        setNeeds2fa(true);
        setError('Enter the code from your authenticator app.');
        return;
      }
      if (!response.ok) {
        setError(
          data.code === 'EMAIL_NOT_VERIFIED'
            ? 'Verify your email first. We just sent the link again.'
            : data.error || 'Could not sign you in.'
        );
        return;
      }
      toast(data.moved > 0 ? `Signed in. ${data.moved} guest wishlist${data.moved === 1 ? '' : 's'} moved into your account.` : 'Signed in.', 'success');
      router.push(next);
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountsAuthShell>
      <AuthHeader title="Welcome Back" subtitle="Sign in to your Serika account" />
      {notice && <FormAlert tone="ok">{notice}</FormAlert>}
      <form onSubmit={submit} className="accounts-form" aria-busy={busy}>
        {error && <FormAlert>{error}</FormAlert>}
        <div>
          <label className="sk-label" htmlFor="email">Email Address</label>
          <input id="email" type="email" className="sk-input" placeholder="name@example.com" disabled={busy} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="accounts-password-label">
            <label className="sk-label" htmlFor="password">Password</label>
            <a href="https://accounts.serika.dev/forgot-password" target="_blank" rel="noopener noreferrer">Forgot?</a>
          </div>
          <input id="password" type="password" className="sk-input" placeholder="••••••••" disabled={busy} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {needs2fa && (
          <div>
            <label className="sk-label" htmlFor="twofa">Authenticator code</label>
            <input id="twofa" disabled={busy} inputMode="numeric" autoComplete="one-time-code" className="sk-input tracking-[0.3em]" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="000000" required autoFocus />
          </div>
        )}
        <button type="submit" className="sk-btn sk-btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : needs2fa ? 'Verify and sign in' : 'Sign In'}
        </button>
      </form>

      <div className="accounts-divider">or</div>
      <Link href={`/access?${new URLSearchParams({ next })}`} className="sk-btn sk-btn-secondary no-underline!">
        Use a wishlist without an account
      </Link>

      <p className="accounts-footnote">
        Don&apos;t have an account? <Link href={`/register?${new URLSearchParams({ next })}`}>Create one now</Link>
      </p>
    </AccountsAuthShell>
  );
}
