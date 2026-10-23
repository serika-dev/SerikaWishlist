'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Bottom sheet on phones, centred dialog from 640px. Escape and the backdrop close it. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheet.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={sheet} tabIndex={-1} role="dialog" aria-modal="true" className={`sheet outline-none ${wide ? '!max-w-[860px]' : ''}`}>
        {title !== undefined && (
          <div className="sticky top-0 z-10 flex items-center gap-3 px-5 h-14 border-b border-[var(--color-line)] bg-[#0d0c12]/95 backdrop-blur">
            <h2 className="font-extrabold text-[16px] truncate">{title}</h2>
            <button type="button" onClick={onClose} className="btn btn-bare btn-icon ml-auto" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        {title === undefined && (
          <button type="button" onClick={onClose} className="btn btn-icon absolute right-3 top-3 z-20 bg-black/60 text-white hover:bg-black/80 rounded-full" aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
