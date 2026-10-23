'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyCode({ code, label = 'Copy code' }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt('Copy this:', code);
        }
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Copied' : label}
    </button>
  );
}
