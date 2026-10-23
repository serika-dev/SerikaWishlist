'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from './Toaster';

export function ShareButton({ url, title, isPrivate = false, className = 'btn btn-ghost' }: { url: string; title: string; isPrivate?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const share = async () => {
    if (isPrivate) {
      toast('This list is private. Change who can see it in settings before sharing.', 'info');
      return;
    }
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled, or not allowed here: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied. Send it to anyone.', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <button type="button" onClick={share} className={className}>
      {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? 'Copied' : 'Share'}
    </button>
  );
}
