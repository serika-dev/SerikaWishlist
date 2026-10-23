import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { BookmarkletShowcase, Faq, Features, HeroPreview, Steps, WorksWith } from '@/components/home/Sections';
import { NewListButton } from '@/components/NewListButton';
import { listsForViewer } from '@/lib/lists';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const viewer = await getViewer();
  const hasLists = (await listsForViewer(viewer)).length > 0;

  const primary = hasLists ? (
    <Link href="/lists" className="btn btn-primary btn-lg">
      Open my wishlists <ArrowRight size={17} />
    </Link>
  ) : (
    <NewListButton label="Start a wishlist" className="btn btn-primary btn-lg" showIcon={false} />
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
      <section className="grid lg:grid-cols-[1fr_1.05fr] gap-14 lg:gap-12 items-center pt-16 sm:pt-24 pb-20">
        <div className="enter">
          <p className="eyebrow">Serika Wishlist</p>
          <h1 className="display mt-5 text-[46px] sm:text-[64px] xl:text-[72px]">
            Everything you want.
            <br />
            <span className="text-[var(--color-violet)]">One list.</span>
          </h1>
          <p className="mt-6 max-w-[500px] text-[17px] muted leading-relaxed">
            Save things from any store, share a single link, and let friends and family gift without doubling up or
            spoiling the surprise. Prices show up in each viewer’s own currency.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {primary}
            {!viewer.user && (
              <Link href="/login" className="btn btn-ghost btn-lg">
                Sign in with Serika
              </Link>
            )}
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] muted">
            {['Free', 'No account needed', 'Works with any store'].map((point) => (
              <li key={point} className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-[var(--color-violet-lift)]" /> {point}
              </li>
            ))}
          </ul>
        </div>
        <HeroPreview />
      </section>

      <WorksWith />
      <Features />
      <Steps />
      <BookmarkletShowcase />
      <Faq />

      <section className="mt-24 rounded-[8px] border border-[var(--color-line)] bg-[radial-gradient(50rem_18rem_at_50%_0%,rgba(124,58,237,0.2),transparent),var(--color-panel)] px-6 py-14 sm:py-16 text-center">
        <h2 className="display text-[32px] sm:text-[44px]">Start your wishlist</h2>
        <p className="mt-3 muted">It takes a minute, and you don’t need an account.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{primary}</div>
      </section>
    </div>
  );
}
