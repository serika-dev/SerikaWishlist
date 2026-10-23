'use client';

import { Check, GripVertical, Star } from 'lucide-react';
import { Price } from '@/components/Money';
import { hostOf } from '@/lib/format';
import type { Item } from '@/lib/types';
import { ItemImage } from './ItemImage';

export function ItemCard({
  item,
  isOwner,
  revealReservations,
  onOpen,
  drag,
}: {
  item: Item;
  isOwner: boolean;
  revealReservations: boolean;
  onOpen: () => void;
  drag?: {
    enabled: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    onDragEnd: () => void;
    isOver: boolean;
  };
}) {
  const reserved = item.reservedCount ?? 0;
  const fullyReserved = reserved >= item.quantity;
  const showReserved = (revealReservations && reserved > 0) || item.reservedByMe;
  const received = Boolean(item.receivedAt);
  const store = item.store || hostOf(item.url);

  return (
    <article
      className={`item-card cursor-pointer ${drag?.isOver ? 'ring-2 ring-[var(--color-violet)]' : ''}`}
      data-done={received || (!isOwner && fullyReserved && !item.reservedByMe)}
      onClick={onOpen}
      draggable={drag?.enabled}
      onDragStart={drag?.enabled ? drag.onDragStart : undefined}
      onDragOver={drag?.enabled ? drag.onDragOver : undefined}
      onDrop={drag?.enabled ? drag.onDrop : undefined}
      onDragEnd={drag?.enabled ? drag.onDragEnd : undefined}
    >
      <div className="item-media">
        <ItemImage src={item.imageUrl} alt="" store={store} />
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5 pointer-events-none">
          {item.priority > 0 && (
            <span className="chip chip-violet">
              <Star size={11} fill="currentColor" /> Most wanted
            </span>
          )}
          {received && (
            <span className="chip chip-ok">
              <Check size={11} /> Received
            </span>
          )}
          {!received && showReserved && (
            <span className="chip chip-ok">
              {item.reservedByMe ? 'You’re getting this' : fullyReserved ? 'Reserved' : `${reserved}/${item.quantity} reserved`}
            </span>
          )}
        </div>
        {drag?.enabled && (
          <span className="absolute top-2 right-2 h-7 w-7 rounded-[3px] bg-black/60 text-white/80 flex items-center justify-center cursor-grab" aria-hidden="true">
            <GripVertical size={15} />
          </span>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] dim truncate">{store || 'Wish'}</p>
        <h3 className="mt-1 font-semibold text-[14.5px] leading-snug clamp-2">{item.title}</h3>
        {item.note && <p className="mt-1.5 text-[12.5px] dim clamp-2">{item.note}</p>}
        <div className="mt-auto pt-3 flex items-start justify-between gap-2">
          <Price amount={item.price} currency={item.currency} />
          {item.quantity > 1 && <span className="text-[12px] dim pt-0.5">× {item.quantity}</span>}
        </div>
      </div>
    </article>
  );
}
