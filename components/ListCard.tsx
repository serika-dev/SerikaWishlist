'use client';

import Link from 'next/link';
import { Gift, Globe, Link2, Lock, Users } from 'lucide-react';
import { plural, relativeTime } from '@/lib/format';
import type { Wishlist } from '@/lib/types';
import { useMoney } from './Money';

const VISIBILITY = {
  public: { icon: Globe, label: 'Public' },
  unlisted: { icon: Link2, label: 'Link only' },
  friends: { icon: Users, label: 'Friends' },
  private: { icon: Lock, label: 'Private' },
} as const;

/** A list on the dashboard: a mosaic of its first four photos, then the facts. */
export function ListCard({ list, showVisibility = true }: { list: Wishlist; showVisibility?: boolean }) {
  const { total } = useMoney();
  const images = list.previewImages ?? [];
  const vis = VISIBILITY[list.visibility];
  const value = total(Object.entries(list.totals ?? {}).map(([currency, amount]) => ({ amount, currency })));

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
          <div className="h-full flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.22),transparent_60%)]">
            {list.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={list.iconUrl} alt="" className="h-20 w-20 rounded-[14px] object-cover border border-[var(--color-line-strong)] shadow-[0_12px_30px_rgba(0,0,0,0.5)]" />
            ) : (
              <Gift size={36} strokeWidth={1.5} className="text-[var(--color-violet-lift)]/70" />
            )}
          </div>
        )}
        {images.length > 0 && list.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={list.iconUrl} alt="" className="absolute left-3 bottom-3 h-10 w-10 rounded-[8px] object-cover border-2 border-[var(--color-panel)] shadow-lg" />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-extrabold text-[17px] leading-tight truncate">{list.title}</h3>
        <p className="mt-1 text-[13px] dim tnum">
          {plural(list.itemCount ?? 0, 'wish', 'wishes')}
          {value ? <> · {value}</> : null}
        </p>
        <div className="mt-auto pt-3 flex items-center justify-between text-[11.5px] dim">
          {showVisibility ? (
            <span className="inline-flex items-center gap-1.5">
              <vis.icon size={13} /> {vis.label}
            </span>
          ) : (
            <span />
          )}
          <span suppressHydrationWarning>Updated {relativeTime(list.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
