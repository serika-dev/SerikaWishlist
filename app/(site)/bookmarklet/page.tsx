import type { Metadata } from 'next';
import Link from 'next/link';
import { BookmarkletLink } from '@/components/BookmarkletLink';
import { CopyCode } from '@/components/CopyCode';
import { bookmarkletCode } from '@/lib/bookmarklet';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Bookmarklet' };

const STEPS = [
  { title: 'Show your bookmarks bar', body: 'Press Ctrl + Shift + B (Cmd + Shift + B on a Mac) if you can’t see it.' },
  { title: 'Drag the button up there', body: 'Grab the violet button below and drop it on the bar. That’s the install.' },
  { title: 'Click it while you shop', body: 'On any product page, click it. A small window shows what it found: pick a list, add.' },
];

export default function BookmarkletPage() {
  const code = bookmarkletCode(config.BASE_URL);
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 sm:pt-14">
      <p className="eyebrow">Bookmarklet</p>
      <h1 className="display text-[40px] sm:text-[64px] mt-2">
        One click.<br />
        <span className="text-[var(--color-violet)]">Any store.</span>
      </h1>
      <p className="mt-5 max-w-2xl muted text-[16px]">
        The Serika Wishlist button lives in your bookmarks bar. Click it on a product page and it grabs the name, photo
        and price, even on stores that hide them from other sites. On a Throne, MyWishlist or Wishlist.com list, it
        imports the whole list.
      </p>

      <div className="mt-12 card corner glow-card relative overflow-hidden p-8 sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_0%,rgba(139,92,246,0.22),transparent)] pointer-events-none" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] items-center">
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="display-italic text-[40px] text-[var(--color-violet)]">0{i + 1}</span>
                <p className="mt-1 font-extrabold text-[16px]">{step.title}</p>
                <p className="mt-1 text-[13.5px] muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col items-center gap-3">
            <span className="text-[12px] dim uppercase tracking-[0.18em] font-bold">Drag me ↑</span>
            <BookmarkletLink code={code} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="card p-6">
          <p className="eyebrow">On a phone or tablet</p>
          <p className="mt-3 text-[14px] muted">
            Mobile browsers don’t do drag and drop. Easiest: copy the product link from the store’s share button and
            paste it into a list. Or make any bookmark, edit it, and replace its address with the code below.
          </p>
          <div className="mt-4"><CopyCode code={code} label="Copy bookmarklet code" /></div>
        </section>
        <section className="card p-6">
          <p className="eyebrow">Private by design</p>
          <p className="mt-3 text-[14px] muted">
            The bookmarklet only reads the page when you click it, and only sends what you see in its window. Nothing
            is saved until you press Add. No extension, no permissions, nothing running in the background.
          </p>
          <p className="mt-3 text-[13px] dim">
            Moving a whole list? The <Link href="/import" className="text-[var(--color-violet-lift)] hover:underline">import page</Link> takes a link too.
          </p>
        </section>
      </div>
    </div>
  );
}
