'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from './Toaster';

/**
 * Creates a wishlist straight away and opens it. For visitors without an
 * account this is also what starts their guest session.
 */
export function NewListButton({
  label = 'New wishlist',
  className = 'btn btn-primary',
  title,
  showIcon = true,
}: {
  label?: string;
  className?: string;
  title?: string;
  showIcon?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'My wishlist' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/w/${data.list.slug}?new=1`);
      router.refresh();
    } catch (error) {
      toast((error as Error).message || 'Could not create the wishlist.', 'error');
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={create} disabled={busy} className={className}>
      {busy ? <span className="spinner" /> : showIcon ? <Plus size={17} strokeWidth={2.6} /> : null}
      {label}
    </button>
  );
}
