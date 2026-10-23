import Link from 'next/link';
import { ArrowRight, Bookmark, Check, EyeOff, Gift, Import, Mail, MessageCircle, Users } from 'lucide-react';

/**
 * Homepage sections below the hero. Every illustration is built from the
 * app's own pieces (cards, chips, the email button) so the page shows the
 * product rather than describing it.
 */

const STORES = ['Amazon', 'bol', 'Crunchyroll', 'Otakumode', 'CDJapan', 'AmiAmi', 'Etsy', 'IKEA', 'Steam', 'Good Smile', 'Solaris Japan', 'Uniqlo', 'Nintendo', 'Animate', 'Zalando', 'Archonia'];

export function StoreMarquee() {
  const row = [...STORES, ...STORES];
  return (
    <section className="border-y border-[var(--color-line)] py-6 -mx-4 sm:-mx-6 overflow-hidden" aria-label="Works with any store">
      <div className="relative [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max gap-10 [animation:marquee_38s_linear_infinite] hover:[animation-play-state:paused]">
          {row.map((store, i) => (
            <span key={i} className="display-italic text-[22px] sm:text-[26px] text-white/[0.16] whitespace-nowrap" aria-hidden={i >= STORES.length}>
              {store}
            </span>
          ))}
        </div>
      </div>
      <p className="text-center text-[12px] dim mt-3 tracking-[0.18em] uppercase font-bold">Works with any store on the internet</p>
    </section>
  );
}

const STEPS = [
  { title: 'Start a list', body: 'No account needed. Name it, pick an emoji, done.' },
  { title: 'Add from anywhere', body: 'Paste a link, or click the bookmarklet on any product page.' },
  { title: 'Share one link', body: 'Friends see what you want and quietly claim gifts.' },
];

export function Steps() {
  return (
    <section className="py-20">
      <p className="eyebrow text-center">How it works</p>
      <h2 className="display text-center text-[34px] sm:text-[48px] mt-3">
        Three steps. <span className="text-[var(--color-violet)]">Zero hassle.</span>
      </h2>
      <ol className="mt-12 grid gap-px sm:grid-cols-3 bg-[var(--color-line)] border border-[var(--color-line)] rounded-[4px] overflow-hidden">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative bg-[var(--color-ink)] p-7 sm:p-8 group">
            <span className="display-italic text-[64px] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(139,92,246,0.7)] group-hover:text-[var(--color-violet)] transition-colors">
              0{i + 1}
            </span>
            <p className="mt-4 font-extrabold text-[18px]">{step.title}</p>
            <p className="mt-1.5 text-[14px] muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Tile({
  className = '',
  icon,
  eyebrow,
  title,
  body,
  children,
  href,
  cta,
}: {
  className?: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <article className={`card relative overflow-hidden flex flex-col group ${className}`}>
      <div className="relative h-[220px] sm:h-[240px] overflow-hidden border-b border-[var(--color-line)] bg-[radial-gradient(28rem_14rem_at_50%_0%,rgba(139,92,246,0.18),transparent),#08070c]">
        {children}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <p className="eyebrow inline-flex items-center gap-2">{icon} {eyebrow}</p>
        <h3 className="display text-[24px] mt-2.5">{title}</h3>
        <p className="mt-2 text-[14px] muted leading-relaxed">{body}</p>
        {href && cta && (
          <Link href={href} className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-violet-lift)] hover:gap-2.5 transition-all">
            {cta} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}

/** A store page with the bookmarklet popup open over it. */
function BookmarkletArt() {
  return (
    <div className="absolute inset-0 p-6 flex items-end justify-center" aria-hidden="true">
      <div className="absolute left-6 right-6 sm:right-[30%] top-6 bottom-0 rounded-t-[6px] border border-white/10 bg-[#f4f4f6] overflow-hidden">
        <div className="h-7 bg-[#e4e4e9] flex items-center gap-1.5 px-3">
          <span className="h-2 w-2 rounded-full bg-[#fb7185]" /><span className="h-2 w-2 rounded-full bg-[#fbbf24]" /><span className="h-2 w-2 rounded-full bg-[#34d399]" />
          <span className="ml-3 h-3.5 flex-1 max-w-[220px] rounded-full bg-white" />
          <span className="ml-auto h-4 px-2 rounded-[3px] bg-[#7c3aed] text-[8.5px] font-black italic text-white flex items-center">✦ SERIKA WISHLIST</span>
        </div>
        <div className="p-4 grid grid-cols-[96px_1fr] gap-4">
          <div className="aspect-square rounded-[4px] bg-gradient-to-br from-[#c4b5fd] to-[#7c3aed] flex items-center justify-center text-4xl">🧸</div>
          <div className="space-y-2 pt-1">
            <div className="h-3 w-4/5 rounded bg-[#d4d4dc]" />
            <div className="h-3 w-3/5 rounded bg-[#d4d4dc]" />
            <div className="h-4 w-16 rounded bg-[#a78bfa]/60 mt-3" />
            <div className="h-7 w-28 rounded bg-[#f59e0b]/70 mt-3" />
          </div>
        </div>
      </div>
      <div className="relative ml-auto mr-2 sm:mr-6 mb-4 w-[210px] card bg-[#0d0c12] shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-3 group-hover:-translate-y-1 transition-transform">
        <p className="wordmark text-[11px]">Serika<b>Wishlist</b></p>
        <div className="mt-2 flex gap-2 items-center">
          <span className="h-10 w-10 rounded-[3px] bg-gradient-to-br from-[#c4b5fd] to-[#7c3aed] flex items-center justify-center text-lg">🧸</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate">Big 40cm plushie</p>
            <p className="text-[11px] font-extrabold text-[var(--color-violet-lift)]">€39</p>
          </div>
        </div>
        <div className="mt-2 h-6 rounded-[2px] border border-white/10 text-[10px] flex items-center px-2 dim">🎂 Birthday 2026</div>
        <div className="mt-2 h-7 rounded-[2px] bg-[linear-gradient(90deg,#6d28d9,#8b5cf6)] text-[9.5px] font-black italic uppercase tracking-wider flex items-center justify-center">Add to wishlist</div>
      </div>
    </div>
  );
}

/** The magic-link email, in Serika's email style. */
function EmailArt() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6" aria-hidden="true">
      <div className="w-full max-w-[260px] rotate-[-3deg] group-hover:rotate-0 transition-transform duration-300 rounded-[4px] overflow-hidden border border-white/10 bg-[#09050f] shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
        <div className="h-12 bg-[linear-gradient(120deg,#1e1b4b,#5b21b6_50%,#0e7490)]" />
        <div className="h-[2px] bg-[linear-gradient(90deg,#5b21b6,#a855f7,#7c3aed)]" />
        <div className="p-4">
          <p className="text-[8px] font-bold tracking-[0.25em] text-[#c084fc]">SERIKA WISHLIST</p>
          <p className="display-italic text-[18px] mt-1">Your edit link</p>
          <p className="text-[10px] text-[#e9e1fb] mt-2">Hey, I’m <b className="text-[#c084fc]">Serika</b>,</p>
          <div className="mt-2 space-y-1">
            <div className="h-1.5 rounded bg-white/15 w-full" />
            <div className="h-1.5 rounded bg-white/15 w-4/5" />
          </div>
          <div className="mt-3 inline-block px-3 py-1.5 bg-[linear-gradient(90deg,#5b21b6,#7c3aed)] text-[8.5px] font-black italic uppercase tracking-wider">Edit my wishlists</div>
        </div>
      </div>
    </div>
  );
}

function ImportArt() {
  const sources = [
    { name: 'Throne', emoji: '👑' },
    { name: 'MyWishlist', emoji: '🎁' },
    { name: 'Wishlist.com', emoji: '📝' },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 p-6" aria-hidden="true">
      <div className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <span key={s.name} className="chip !h-8 !text-[11px] bg-[#0d0c12]" style={{ transform: `translateX(${i === 1 ? 10 : 0}px)` }}>
            <span className="text-[14px]">{s.emoji}</span> {s.name}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[var(--color-violet)]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-current [animation:pulse-dot_1.4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
        <ArrowRight size={18} />
      </div>
      <div className="h-[92px] w-[92px] rounded-[22px] bg-[linear-gradient(160deg,#5b21b6,#22074a)] shadow-[0_0_40px_rgba(139,92,246,0.5)] flex items-center justify-center group-hover:scale-105 transition-transform">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-full w-full" />
      </div>
    </div>
  );
}

function ReservedArt() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 p-6" aria-hidden="true">
      {[
        { emoji: '🎧', name: 'Headphones', price: '€249', state: 'reserved' },
        { emoji: '📚', name: 'Frieren 1–12', price: '€118', state: 'open' },
      ].map((item) => (
        <div key={item.name} className="w-[128px] rounded-[4px] border border-[var(--color-line)] bg-[var(--color-panel)] overflow-hidden">
          <div className="relative aspect-square bg-gradient-to-br from-[#2e1065] to-[#4c1d95] flex items-center justify-center text-4xl">
            {item.emoji}
            {item.state === 'reserved' && (
              <span className="chip chip-ok absolute top-1.5 left-1.5 !h-5 !text-[9px]"><Check size={10} /> Reserved</span>
            )}
          </div>
          <div className="px-2 py-1.5">
            <p className="text-[11px] font-semibold truncate">{item.name}</p>
            <p className="text-[11px] font-extrabold text-[var(--color-violet-lift)]">{item.price}</p>
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 card px-3 py-1.5 bg-[#111018] text-[11px] inline-flex items-center gap-1.5 whitespace-nowrap">
        <EyeOff size={12} className="text-[var(--color-violet-lift)]" /> Hidden from the list owner
      </div>
    </div>
  );
}

function FriendsArt() {
  const people = [
    { n: 'M', bg: 'from-[#f472b6] to-[#7c3aed]' },
    { n: 'K', bg: 'from-[#22d3ee] to-[#5b21b6]' },
    { n: 'A', bg: 'from-[#fbbf24] to-[#c026d3]' },
    { n: 'R', bg: 'from-[#34d399] to-[#4c1d95]' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6" aria-hidden="true">
      <div className="flex -space-x-3">
        {people.map((p) => (
          <span key={p.n} className={`h-11 w-11 rounded-full border-[3px] border-[#08070c] bg-gradient-to-br ${p.bg} flex items-center justify-center font-black text-[18px]`}>
            {p.n}
          </span>
        ))}
      </div>
      <div className="w-full max-w-[290px] rounded-[6px] border border-white/10 bg-[#111214] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <p className="text-[9.5px] font-bold tracking-[0.18em] text-white/50 uppercase flex items-center gap-1.5">
          <MessageCircle size={11} /> SerikaCord profile
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg">🎂</span>
          <div>
            <p className="text-[12px] font-bold">Birthday 2026</p>
            <p className="text-[10px] text-white/50">12 wishes · €1,284</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {['🎧', '📚', '🧸', '🎮'].map((e) => (
            <span key={e} className="aspect-square rounded-[3px] bg-[#f4f4f6] flex items-center justify-center text-lg">{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Bento() {
  return (
    <section>
      <p className="eyebrow">Everything included</p>
      <h2 className="display text-[34px] sm:text-[48px] mt-3 max-w-3xl">
        Built for wishing, <span className="text-[var(--color-violet)]">made for gifting</span>
      </h2>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Tile
          className="lg:col-span-2"
          icon={<Bookmark size={13} />}
          eyebrow="Bookmarklet"
          title="One click, any store"
          body="Drag the button to your bookmarks bar. On any product page it grabs the name, photo and price, even on stores that block other sites. Or just paste a link."
          href="/bookmarklet"
          cta="Get the bookmarklet"
        >
          <BookmarkletArt />
        </Tile>
        <Tile
          icon={<Mail size={13} />}
          eyebrow="No account needed"
          title="Saved with your email"
          body="Start as a guest. Add your email and a magic link lets you edit from any device. Make a Serika account later and your lists move in by themselves."
        >
          <EmailArt />
        </Tile>
        <Tile
          icon={<Import size={13} />}
          eyebrow="Imports"
          title="Bring your old lists"
          body="Paste a Throne, MyWishlist or Wishlist.com link and every wish comes along, with photos, prices, notes and store links."
          href="/import"
          cta="Import a wishlist"
        >
          <ImportArt />
        </Tile>
        <Tile
          icon={<Gift size={13} />}
          eyebrow="Gifting"
          title="Nobody buys it twice"
          body="Friends mark a wish “I’m getting this”. You never find out who reserved what, unless you turn spoilers on."
        >
          <ReservedArt />
        </Tile>
        <Tile
          icon={<Users size={13} />}
          eyebrow="Friends"
          title="Your Serika friends, built in"
          body="The same friends as on SerikaCord. Share lists only friends can open, and show your wishlist on your SerikaCord profile."
          href="/friends"
          cta="See friends’ wishes"
        >
          <FriendsArt />
        </Tile>
      </div>
    </section>
  );
}
