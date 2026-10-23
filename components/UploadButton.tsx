'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from './Toaster';

export async function uploadImageFile(file: File, kind: 'icon' | 'item'): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Images can be up to 5 MB.');
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/api/uploads?kind=${kind}`, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The upload failed.');
  return data.url as string;
}

/** A button that opens the file picker and uploads the chosen image. */
export function UploadButton({
  kind,
  onUploaded,
  label = 'Upload',
  className = 'btn btn-ghost btn-sm',
}: {
  kind: 'icon' | 'item';
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onUploaded(await uploadImageFile(file, kind));
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <button type="button" className={className} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <span className="spinner" /> : <Upload size={14} />} {busy ? 'Uploading…' : label}
      </button>
    </>
  );
}
