'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface Bg {
  url: string;
  artist: string;
  id?: number | string;
}

/**
 * serika-accounts' sign-in layout: Serika.art artwork on the left, the form
 * on the right (a bottom sheet over the art on phones).
 */
export function AccountsAuthShell({ children }: { children: ReactNode }) {
  const [bg, setBg] = useState<Bg | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/random-bg', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const data = body?.data;
        if (!data?.url || controller.signal.aborted) return;
        const artist = data.tags?.find((tag: { type: string; name: string }) => tag.type === 'artist')?.name;
        setBg({
          url: data.url + (data.url.includes('?') ? '&' : '?') + 'output=webp&w=1400&fit=cover&a=attention',
          artist: artist || data.user?.username || 'Unknown Artist',
          id: data.post_id,
        });
      })
      .catch(() => {
        // Artwork is decoration; the form works without it.
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="sk-auth-split accounts-auth">
      <div className="sk-auth-left">
        {bg && (
          <>
            <div className="sk-auth-bgblur" style={{ backgroundImage: `url("${bg.url}")`, opacity: loaded ? 1 : 0 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bg.url} alt="" className="sk-auth-bgimg" onLoad={() => setLoaded(true)} style={{ opacity: loaded ? 1 : 0 }} />
            <div className="sk-auth-attr">
              {bg.id ? (
                <a href={`https://serika.art/image/${bg.id}`} target="_blank" rel="noreferrer">
                  Art by {bg.artist}
                </a>
              ) : (
                <>Art by {bg.artist}</>
              )}
            </div>
          </>
        )}
      </div>

      <div className="sk-auth-right">
        <div className="sk-auth-logo">
          <a href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wishlist-logo.svg" alt="Serika Wishlist" />
          </a>
        </div>
        <div className="sk-auth-center">{children}</div>
        <div className="sk-auth-copy">© {new Date().getFullYear()} Serika. All rights reserved.</div>
      </div>
    </div>
  );
}

export function AuthHeader({ title, subtitle, icon }: { title: string; subtitle?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="text-center mb-7">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wishlist-logo.svg" alt="Serika Wishlist" className="sk-mobile-logo h-[34px] mb-5" />
      {icon && <div className="flex justify-center mb-3 text-[var(--color-primary)]">{icon}</div>}
      <h2 className="m-0 mb-1.5 text-[1.6rem] font-bold tracking-[-0.02em]">{title}</h2>
      {subtitle && <p className="m-0 text-[0.9rem] text-[var(--color-text-muted)]">{subtitle}</p>}
    </div>
  );
}

export function FormAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'ok' }) {
  return (
    <p role="alert" className="accounts-alert" data-tone={tone}>
      {children}
    </p>
  );
}
