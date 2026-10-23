'use client';

import { useEffect, useRef } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { useToast } from './Toaster';

/**
 * The draggable bookmarklet. React refuses javascript: hrefs, so the code is
 * attached after mount; the link text becomes the bookmark's name.
 */
export function BookmarkletLink({ code, size = 'lg' }: { code: string; size?: 'lg' | 'sm' }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    ref.current?.setAttribute('href', code);
  }, [code]);

  return (
    <a
      ref={ref}
      draggable
      onClick={(e) => {
        e.preventDefault();
        toast('Drag this button to your bookmarks bar, then click it on any product page.', 'info');
      }}
      className={`group relative inline-flex items-center gap-2.5 cursor-grab active:cursor-grabbing select-none rounded-[4px] border border-[var(--color-violet)] bg-[linear-gradient(90deg,#4c1d95,#7c3aed)] text-white font-black italic uppercase tracking-[0.06em] shadow-[0_0_0_4px_rgba(139,92,246,0.15),0_14px_40px_rgba(124,58,237,0.45)] hover:shadow-[0_0_0_6px_rgba(139,92,246,0.22),0_18px_50px_rgba(124,58,237,0.6)] transition ${size === 'lg' ? 'h-14 px-6 text-[15px]' : 'h-10 px-4 text-[12.5px]'}`}
    >
      <BookmarkPlus size={size === 'lg' ? 20 : 16} className="not-italic" aria-hidden="true" />
      Serika Wishlist
    </a>
  );
}
