import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <Wordmark size={20} />
      <p className="display-italic text-[120px] sm:text-[160px] leading-none mt-8 text-[var(--color-violet)] [text-shadow:0_0_60px_rgba(139,92,246,0.5)]">404</p>
      <h1 className="display text-[28px] sm:text-[36px] mt-2">This wish got away</h1>
      <p className="muted mt-3 max-w-md">The list may be private, deleted, or the link has a typo.</p>
      <Link href="/" className="btn btn-primary mt-8">Back home</Link>
    </div>
  );
}
