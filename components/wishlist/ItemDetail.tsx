'use client';

import { useState } from 'react';
import { Check, ExternalLink, Gift, Pencil, Star, Trash2, Undo2 } from 'lucide-react';
import { Price } from '@/components/Money';
import { hostOf, relativeTime } from '@/lib/format';
import type { Item } from '@/lib/types';
import { ItemImage } from './ItemImage';

export function ItemDetail({
  item,
  isOwner,
  revealReservations,
  busy,
  onEdit,
  onToggle,
  onDelete,
  onReserve,
  onUnreserve,
}: {
  item: Item;
  isOwner: boolean;
  revealReservations: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: (patch: { priority?: number; received?: boolean }) => void;
  onDelete: () => void;
  onReserve: (name: string) => void;
  onUnreserve: () => void;
}) {
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reserved = item.reservedCount ?? 0;
  const fullyReserved = reserved >= item.quantity;
  const received = Boolean(item.receivedAt);
  const store = item.store || hostOf(item.url);

  return (
    <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative aspect-square sm:aspect-auto sm:min-h-[420px] bg-[#f4f4f6]">
        <ItemImage src={item.imageUrl} alt={item.title} store={store} className="absolute inset-0 w-full h-full object-contain p-[8%]" />
      </div>
      <div className="p-6 sm:p-7 flex flex-col">
        <p className="eyebrow !text-[10.5px]">{store || 'Wish'}</p>
        <h2 className="mt-2 text-[22px] font-extrabold leading-tight">{item.title}</h2>
        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          {item.price !== null && <Price amount={item.price} currency={item.currency} size="lg" />}
          {item.quantity > 1 && <span className="muted text-[14px]">wants {item.quantity}</span>}
          {item.priority > 0 && (
            <span className="chip chip-violet">
              <Star size={11} fill="currentColor" /> Most wanted
            </span>
          )}
        </div>
        {item.note && <p className="mt-4 text-[14px] muted whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">{item.note}</p>}

        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary mt-6">
            View at {store || 'the store'} <ExternalLink size={15} />
          </a>
        )}

        {!isOwner && !received && (
          <div className="mt-5 pt-5 border-t border-[var(--color-line)]">
            {item.reservedByMe ? (
              <div className="flex items-center gap-3">
                <span className="chip chip-ok"><Check size={12} /> You’re getting this</span>
                <button type="button" className="btn btn-bare btn-sm ml-auto" disabled={busy} onClick={onUnreserve}>
                  <Undo2 size={15} /> Undo
                </button>
              </div>
            ) : fullyReserved ? (
              <p className="text-[13.5px] muted flex items-center gap-2"><Gift size={16} /> Someone’s already getting this one.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onReserve(name);
                }}
              >
                <p className="font-bold text-[14px]">Getting this as a gift?</p>
                <p className="text-[12.5px] dim mt-0.5">
                  Mark it so nobody else buys it too. The owner won’t see it{reserved > 0 ? `. ${reserved} of ${item.quantity} already taken` : ''}.
                </p>
                <div className="mt-3 flex gap-2">
                  <input className="field !h-10" placeholder="Your name (optional)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                  <button type="submit" className="btn btn-ghost shrink-0 !h-10" disabled={busy}>
                    <Gift size={15} /> I’m getting this
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-5 pt-5 border-t border-[var(--color-line)]">
            {revealReservations && reserved > 0 && (
              <p className="text-[12.5px] text-[var(--color-ok)] mb-3">
                Reserved{item.reservedNames?.length ? ` by ${item.reservedNames.join(', ')}` : ''} ({reserved}/{item.quantity})
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} disabled={busy}>
                <Pencil size={14} /> Edit
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onToggle({ priority: item.priority > 0 ? 0 : 1 })} disabled={busy}>
                <Star size={14} fill={item.priority > 0 ? 'currentColor' : 'none'} /> {item.priority > 0 ? 'Most wanted' : 'Mark most wanted'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onToggle({ received: !received })} disabled={busy}>
                <Check size={14} /> {received ? 'Not received' : 'Got it!'}
              </button>
              {confirmDelete ? (
                <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} disabled={busy}>
                  <Trash2 size={14} /> Really delete?
                </button>
              ) : (
                <button type="button" className="btn btn-bare btn-sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-auto pt-6 text-[11.5px] dim" suppressHydrationWarning>Added {relativeTime(item.createdAt)}</p>
      </div>
    </div>
  );
}
