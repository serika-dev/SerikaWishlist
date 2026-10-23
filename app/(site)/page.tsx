import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Bento, Steps, StoreMarquee } from '@/components/home/Sections';
import { NewListButton } from '@/components/NewListButton';
import { listsForViewer } from '@/lib/lists';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

const MOCK_ITEMS = [
  { emoji: '🎧', name: 'Wireless headphones', price: '€249', tint: 'from-[#2e1065] to-[#4c1d95]', reserved: true },
  { emoji: '📚', name: 'Frieren, vol. 1–12', price: '€118', tint: 'from-[#1e1b4b] to-[#312e81]' },
  { emoji: '🧸', name: 'Big 40cm plushie', price: '€39', tint: 'from-[#3b0764] to-[#6b21a8]', star: true },
  { emoji: '🎮', name: 'Controller, lilac', price: '€69', tint: 'from-[#172554] to-[#4c1d95]' },
];

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:mr-0" aria-hidden="true">
      <div className="absolute -inset-10 bg-[radial-gradient(closest-side,rgba(139,92,246,0.28),transparent)] blur-2xl" />
      <div className="card corner glow-card relative p-5 bg-[#0b0a10]/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎂</span>
          <div>
            <p className="font-extrabold text-lg leading-tight">Birthday 2026</p>
            <p className="text-[12px] dim">12 wishes · €1,284</p>
          </div>
          <span className="chip chip-violet ml-auto">Shared</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {MOCK_ITEMS.map((item) => (
            <div key={item.name} className="rounded-[4px] border border-[var(--color-line)] bg-[var(--color-panel)] overflow-hidden">
              <div className={`relative aspect-[4/3] bg-gradient-to-br ${item.tint} flex items-center justify-center text-4xl`}>
                {item.emoji}
                {item.star && <span className="chip chip-violet absolute top-2 left-2 !h-5 !text-[9.5px]">Most wanted</span>}
                {item.reserved && <span className="chip chip-ok absolute top-2 left-2 !h-5 !text-[9.5px]">Reserved</span>}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[12.5px] font-semibold truncate">{item.name}</p>
                <p className="text-[12px] text-[var(--color-violet-lift)] font-bold">{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -left-4 sm:-left-10 -bottom-7 card px-4 py-3 bg-[#111018]/95 backdrop-blur shadow-2xl [animation:float_6s_ease-in-out_infinite] [--r:-3deg]">
        <p className="text-[11px] eyebrow !tracking-[0.16em]">Bookmarklet</p>
        <p className="text-[13px] font-semibold mt-0.5">Added to Birthday 2026 ✨</p>
      </div>
      <div className="absolute -right-2 sm:-right-4 -top-6 card px-3.5 py-2.5 bg-[#111018]/95 backdrop-blur shadow-2xl [animation:float_7s_ease-in-out_infinite_1s] [--r:4deg]">
        <p className="text-[12.5px] font-semibold">🎁 Someone’s on it</p>
        <p className="text-[11px] dim">Your surprise stays a surprise</p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const viewer = await getViewer();
  const lists = await listsForViewer(viewer);
  const hasLists = lists.length > 0;

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center pt-14 sm:pt-20 pb-20">
        <div className="enter">
          <div className="skew-badge">
            <span>Serika Wishlist</span>
          </div>
          <h1 className="display mt-6 text-[52px] sm:text-[76px] xl:text-[88px]">
            <span className="block text-white">Wish it.</span>
            <span className="block text-[var(--color-violet)] [text-shadow:0_0_40px_rgba(139,92,246,0.45)]">Share it.</span>
            <span className="block text-[#8a8a94]">Get it.</span>
          </h1>
          <span className="bar mt-7" />
          <p className="mt-7 max-w-[520px] text-[17px] muted leading-relaxed">
            One wishlist for everything you want, from any store on the internet. Add things with one click, share one
            link, and the people who love you can gift without ever spoiling the surprise.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {hasLists ? (
              <Link href="/lists" className="btn btn-primary btn-lg">
                Open my wishlists <ArrowRight size={17} />
              </Link>
            ) : (
              <NewListButton label="Start a wishlist" className="btn btn-primary btn-lg" />
            )}
            {!viewer.user && (
              <Link href="/login" className="btn btn-ghost btn-lg">
                Sign in with Serika
              </Link>
            )}
          </div>
          {!viewer.user && (
            <p className="mt-4 text-[13px] dim">No account needed. Save it with just your email.</p>
          )}
        </div>
        <HeroMock />
      </section>

      <StoreMarquee />
      <Steps />
      <Bento />

      <section className="relative mt-24 overflow-hidden card corner p-8 sm:p-12 text-center glow-card">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_20rem_at_50%_-20%,rgba(139,92,246,0.25),transparent)]" />
        <div className="relative">
          <h2 className="display text-[34px] sm:text-[52px]">
            Your next gift <span className="text-[var(--color-violet)]">starts here</span>
          </h2>
          <p className="mt-4 muted">Free, ad-free, and part of your Serika account.</p>
          <div className="mt-8 flex justify-center">
            {hasLists ? (
              <Link href="/lists" className="btn btn-primary btn-lg">
                Open my wishlists <ArrowRight size={17} />
              </Link>
            ) : (
              <NewListButton label="Start a wishlist" className="btn btn-primary btn-lg" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
