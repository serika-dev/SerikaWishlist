import Link from 'next/link';
import { Globe, Link2, Lock, Users } from 'lucide-react';
import { formatMoney, plural, relativeTime } from '@/lib/format';
import type { Wishlist } from '@/lib/types';

const VISIBILITY = {
  public: { icon: Globe, label: 'Public' },
  unlisted: { icon: Link2, label: 'Link only' },
  friends: { icon: Users, label: 'Friends' },
  private: { icon: Lock, label: 'Private' },
} as const;

/** A list on the dashboard: a mosaic of its first four photos, then the facts. */
export function ListCard({ list, showVisibility = true }: { list: Wishlist; showVisibility?: boolean }) {
  const images = list.previewImages ?? [];
  const vis = VISIBILITY[list.visibility];
  return (
    <Link href={`/w/${list.slug}`} className="item-card group">
      <div className="relative aspect-[16/10] bg-[#0e0d13] overflow-hidden">
        {images.length > 0 ? (
          <div className={`grid h-full ${images.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'} ${images.length >= 3 ? 'grid-rows-2' : ''} gap-px bg-[var(--color-line)]`}>
            {images.slice(0, 4).map((src, i) => (
              <div key={i} className={`bg-[#f4f4f6] overflow-hidden ${images.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain p-[8%] transition-transform duration-300 group-hover:scale-105" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.25),transparent_60%)]">
            <span className="text-6xl drop-shadow-[0_8px_24px_rgba(139,92,246,0.5)]">{list.emoji}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        {images.length > 0 && <span className="absolute left-3 bottom-2.5 text-2xl drop-shadow">{list.emoji}</span>}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-extrabold text-[17px] leading-tight truncate">{list.title}</h3>
        <p className="mt-1 text-[13px] dim">
          {plural(list.itemCount ?? 0, 'wish', 'wishes')}
          {list.totalValue ? <> · {formatMoney(list.totalValue.amount, list.totalValue.currency)}</> : null}
        </p>
        <div className="mt-auto pt-3 flex items-center justify-between text-[11.5px] dim">
          {showVisibility ? (
            <span className="inline-flex items-center gap-1.5">
              <vis.icon size={13} /> {vis.label}
            </span>
          ) : (
            <span />
          )}
          <span>Updated {relativeTime(list.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
