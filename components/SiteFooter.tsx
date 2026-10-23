import Link from 'next/link';
import { Wordmark } from './Wordmark';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 py-10 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
        <div>
          <Wordmark size={18} />
          <p className="text-[12.5px] dim mt-2">© {new Date().getFullYear()} Serika. Wishlists from any store.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] muted">
          <Link href="/bookmarklet" className="hover:text-white">Bookmarklet</Link>
          <Link href="/import" className="hover:text-white">Import</Link>
          <a href="https://serika.moe" className="hover:text-white">serika.moe</a>
          <a href="https://issues.serika.dev" className="hover:text-white">Report a bug</a>
          <a href="https://discord.gg/5s2zgwn35y" className="hover:text-white">Discord</a>
        </nav>
      </div>
    </footer>
  );
}
