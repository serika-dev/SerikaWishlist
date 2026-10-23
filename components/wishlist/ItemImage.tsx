'use client';

import { useState } from 'react';

/** Product photo, or the store's initial on a violet field if there is none (or it fails to load). */
export function ItemImage({ src, alt, store, className = '' }: { src: string | null; alt: string; store?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const letter = (store || alt || '?').replace(/^www\./, '').charAt(0).toUpperCase();
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.3),transparent_60%),#120f1c] ${className}`}>
        <span className="display-italic text-[56px] text-[var(--color-violet)]/70">{letter}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />
  );
}
