import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Camera,
  Check,
  Coins,
  EyeOff,
  Gamepad2,
  Headphones,
  Import,
  Mail,
  Shirt,
  Star,
  Users,
  Watch,
  type LucideIcon,
} from 'lucide-react';

/**
 * Homepage sections. Illustrations are drawn from the app's own pieces
 * (cards, chips, prices) with plain line icons standing in for product photos.
 */

const PREVIEW_ITEMS: { icon: LucideIcon; store: string; name: string; local: string; original?: string; tag?: 'reserved' | 'wanted' }[] = [
  { icon: Headphones, store: 'amazon.de', name: 'Wireless headphones', local: '$279', original: '€249', tag: 'reserved' },
  { icon: BookOpen, store: 'bol', name: 'Frieren, volumes 1–12', local: '$132', original: '€118' },
  { icon: Gamepad2, store: 'nintendo.com', name: 'Pro Controller', local: '$69' },
  { icon: Camera, store: 'bhphotovideo', name: 'Instant camera', local: '$89', tag: 'wanted' },
  { icon: Watch, store: 'casio.jp', name: 'Casio F-91W', local: '$21', original: '¥3,190' },
  { icon: Shirt, store: 'uniqlo', name: 'Oversized hoodie, L', local: '$45', original: '£35' },
];

/** A browser window showing a wishlist, prices converted for the viewer. */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] lg:mr-0" aria-hidden="true">
      <div className="absolute -inset-12 bg-[radial-gradient(closest-side,rgba(124,58,237,0.22),transparent)] blur-2xl" />
      <div className="relative rounded-[8px] border border-[var(--color-line-strong)] bg-[#0b0a10] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="h-9 px-3.5 flex items-center gap-1.5 border-b border-[var(--color-line)] bg-[#0f0e14]">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="mx-auto h-5 w-56 rounded-[4px] bg-white/[0.06] text-[10.5px] dim flex items-center justify-center">wish.ado.wtf/w/k7m2qx9p</span>
        </div>
        <div className="p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] dim">Mika’s wishlist</p>
              <p className="display text-[26px] mt-1">Birthday</p>
              <p className="text-[11.5px] dim mt-1 tnum">6 wishes · $635 to go</p>
            </div>
            <span className="chip">Prices in USD</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {PREVIEW_ITEMS.map((item) => (
              <div key={item.name} className="rounded-[4px] border border-[var(--color-line)] bg-[var(--color-panel)] overflow-hidden">
                <div className="relative aspect-square bg-[#f1f1f4] flex items-center justify-center">
                  <item.icon size={34} strokeWidth={1.25} className="text-[#3f3f46]" />
                  {item.tag === 'reserved' && <span className="chip chip-ok absolute top-1.5 left-1.5 !h-[18px] !px-1.5 !text-[8.5px]">Reserved</span>}
                  {item.tag === 'wanted' && (
                    <span className="chip chip-violet absolute top-1.5 left-1.5 !h-[18px] !px-1.5 !text-[8.5px]">
                      <Star size={8} fill="currentColor" /> Most wanted
                    </span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] dim truncate">{item.store}</p>
                  <p className="text-[11px] font-semibold truncate">{item.name}</p>
                  <p className="text-[11.5px] font-extrabold text-[var(--color-violet-lift)] tnum leading-tight">{item.original ? `≈ ${item.local}` : item.local}</p>
                  <p className="text-[9px] dim tnum h-3">{item.original ? `${item.original} at the store` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STORES = ['Amazon', 'bol', 'Etsy', 'IKEA', 'Steam', 'Crunchyroll', 'Uniqlo', 'AmiAmi', 'CDJapan', 'Zalando'];

export function WorksWith() {
  return (
    <section className="border-y border-[var(--color-line)] py-7">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] dim shrink-0">Works with any store</p>
        <ul className="flex flex-wrap gap-x-8 gap-y-2">
          {STORES.map((store) => (
            <li key={store} className="text-[17px] font-bold text-white/35">{store}</li>
          ))}
          <li className="text-[17px] font-bold text-white/20">and the rest of the internet</li>
        </ul>
      </div>
    </section>
  );
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Bookmark, title: 'Add from any store', body: 'Paste a link, or click the bookmarklet on a product page. Name, photo and price fill themselves in.' },
  { icon: Coins, title: 'Prices in your currency', body: 'Wishes keep the store’s price, and everyone sees it converted into their own currency at today’s rate.' },
  { icon: Mail, title: 'No account needed', body: 'Start as a guest and save your list with just your email. A magic link gets you back in from any device.' },
  { icon: Import, title: 'Bring your old lists', body: 'Import from Throne, MyWishlist and Wishlist.com with photos, prices, notes and store links intact.' },
  { icon: EyeOff, title: 'Surprises stay surprises', body: 'Friends mark what they’re getting so nobody doubles up. You never see who reserved what.' },
  { icon: Users, title: 'Made for Serika', body: 'Your Serika friends are built in, and your wishlist can sit on your SerikaCord profile.' },
];

export function Features() {
  return (
    <section className="py-24">
      <div className="max-w-2xl">
        <p className="eyebrow">Features</p>
        <h2 className="display text-[34px] sm:text-[46px] mt-3">Everything a wishlist should do</h2>
      </div>
      <div className="mt-12 grid gap-px bg-[var(--color-line)] border border-[var(--color-line)] rounded-[6px] overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="bg-[var(--color-ink)] p-7 hover:bg-[#0b0a10] transition-colors">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--color-violet)]/12 text-[var(--color-violet-lift)] border border-[var(--color-violet)]/25">
              <feature.icon size={19} strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 font-extrabold text-[17px]">{feature.title}</h3>
            <p className="mt-2 text-[14px] muted leading-relaxed">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { title: 'Start a list', body: 'Give it a name. No sign-up needed to begin.' },
  { title: 'Add what you want', body: 'From any store, by link or with the bookmarklet.' },
  { title: 'Share the link', body: 'People see your wishes in their currency and claim gifts quietly.' },
];

export function Steps() {
  return (
    <section className="grid gap-10 lg:grid-cols-[1fr_1.4fr] items-start">
      <div>
        <p className="eyebrow">How it works</p>
        <h2 className="display text-[34px] sm:text-[46px] mt-3">Ready in a minute</h2>
        <p className="mt-4 muted max-w-md">No setup, no extension to install. Make a list, fill it, send the link to the people who ask what you want.</p>
      </div>
      <ol className="grid gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card flex gap-5 p-5">
            <span className="h-9 w-9 shrink-0 rounded-full border border-[var(--color-violet)]/50 text-[var(--color-violet-lift)] font-extrabold text-[14px] flex items-center justify-center tnum">
              {i + 1}
            </span>
            <div>
              <p className="font-extrabold text-[16px]">{step.title}</p>
              <p className="mt-1 text-[14px] muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A store page with the bookmarklet's window open over it. */
export function BookmarkletShowcase() {
  return (
    <section className="py-24 grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <p className="eyebrow">Bookmarklet</p>
        <h2 className="display text-[34px] sm:text-[46px] mt-3">One click from any product page</h2>
        <p className="mt-4 muted max-w-lg">
          Drag the Serika Wishlist button to your bookmarks bar once. On any shop it reads the product right from your
          screen, so it works even on stores that block other websites, then lets you pick the list.
        </p>
        <ul className="mt-6 space-y-2.5 text-[14px]">
          {['No extension, no permissions', 'Only reads the page when you click it', 'Imports whole lists on Throne, MyWishlist and Wishlist.com'].map((line) => (
            <li key={line} className="flex items-center gap-2.5 muted">
              <Check size={16} className="text-[var(--color-violet-lift)] shrink-0" /> {line}
            </li>
          ))}
        </ul>
        <Link href="/bookmarklet" className="btn btn-ghost mt-8">
          Get the bookmarklet <ArrowRight size={16} />
        </Link>
      </div>

      <div className="relative h-[340px]" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 bottom-6 rounded-[8px] border border-white/10 bg-[#f6f6f8] overflow-hidden">
          <div className="h-8 bg-[#e7e7ec] flex items-center gap-2 px-3">
            <span className="h-4 flex-1 max-w-[260px] rounded-full bg-white" />
            <span className="ml-auto h-5 px-2 rounded-[3px] bg-[#7c3aed] text-[9px] font-bold text-white flex items-center">Serika Wishlist</span>
          </div>
          <div className="p-6 grid grid-cols-[150px_1fr] gap-6">
            <div className="aspect-square rounded-[6px] bg-white border border-black/5 flex items-center justify-center">
              <Camera size={64} strokeWidth={1} className="text-[#3f3f46]" />
            </div>
            <div className="pt-1 text-[#18181b]">
              <p className="text-[11px] text-[#71717a]">Cameras</p>
              <p className="text-[18px] font-bold leading-tight mt-1">Instant camera, lilac</p>
              <p className="text-[18px] font-extrabold mt-3">€79,99</p>
              <div className="mt-4 h-9 w-36 rounded-full bg-[#facc15]" />
            </div>
          </div>
        </div>
        <div className="absolute right-4 sm:right-8 bottom-0 w-[240px] card bg-[#0d0c12] shadow-[0_30px_70px_rgba(0,0,0,0.6)] p-4">
          <p className="wordmark text-[12px]">Serika<b>Wishlist</b></p>
          <div className="mt-3 flex gap-3 items-center">
            <span className="h-12 w-12 rounded-[4px] bg-[#f1f1f4] flex items-center justify-center shrink-0">
              <Camera size={22} strokeWidth={1.25} className="text-[#3f3f46]" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate">Instant camera, lilac</p>
              <p className="text-[12px] font-extrabold text-[var(--color-violet-lift)] tnum">€79.99 <span className="font-normal dim">≈ $90</span></p>
            </div>
          </div>
          <div className="mt-3 h-8 rounded-[3px] border border-white/10 text-[11px] flex items-center px-2.5 muted">Birthday</div>
          <div className="mt-2 h-9 rounded-[3px] bg-[linear-gradient(90deg,#6d28d9,#8b5cf6)] text-[10.5px] font-black italic uppercase tracking-wider flex items-center justify-center">
            Add to wishlist
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  { q: 'Is it free?', a: 'Yes. No ads, no paid tier, no affiliate links added to your wishes.' },
  {
    q: 'Do I need an account?',
    a: 'No. You can make and share a list as a guest and save it with your email. If you later make a Serika account with the same email, your lists move into it automatically.',
  },
  {
    q: 'How do prices in other currencies work?',
    a: 'Each wish keeps the price and currency of its store. Everyone who views it sees that price converted into their own currency at today’s exchange rate, with the store price next to it. You can pick a different currency at any time.',
  },
  {
    q: 'Can I see who is buying what?',
    a: 'Not unless you want to. Reservations are hidden from you by default so gifts stay a surprise; you can turn spoilers on per list.',
  },
  {
    q: 'Which stores work?',
    a: 'Any store with a product page. Most fill in automatically from a pasted link; for the few that block other websites, the bookmarklet reads the page from your own browser.',
  },
];

export function Faq() {
  return (
    <section className="grid gap-10 lg:grid-cols-[1fr_1.4fr] items-start">
      <div>
        <p className="eyebrow">FAQ</p>
        <h2 className="display text-[34px] sm:text-[46px] mt-3">Questions</h2>
      </div>
      <div className="border-t border-[var(--color-line)]">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b border-[var(--color-line)] py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[16px] [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="h-6 w-6 shrink-0 rounded-full border border-[var(--color-line-strong)] flex items-center justify-center text-[14px] dim transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-[14.5px] muted leading-relaxed max-w-2xl">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
