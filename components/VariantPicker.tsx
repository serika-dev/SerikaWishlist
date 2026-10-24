'use client';

import { Check } from 'lucide-react';
import type { ProductVariant } from '@/lib/types';
import { useMoney } from './Money';
import { ItemImage } from './wishlist/ItemImage';

/**
 * The versions a product comes in, as tiles with their own photo and price,
 * the way TOM's product pages show them. With `multiple`, every picked
 * version becomes its own wish.
 */
export function VariantPicker({
  variants,
  selected,
  onChange,
  multiple = false,
}: {
  variants: ProductVariant[];
  selected: string[];
  onChange: (names: string[]) => void;
  multiple?: boolean;
}) {
  const { price } = useMoney();
  const toggle = (name: string) => {
    if (!multiple) return onChange(selected[0] === name ? [] : [name]);
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="field-label !mb-0">Version</span>
        <span className="text-[11.5px] dim">
          {multiple ? (selected.length > 1 ? `${selected.length} picked · one wish each` : 'Pick one or more') : 'Pick one'}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2" role={multiple ? 'group' : 'radiogroup'} aria-label="Version">
        {variants.map((variant) => {
          const on = selected.includes(variant.name);
          const shown = price(variant.price, variant.currency);
          return (
            <button
              key={variant.name}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={on}
              onClick={() => toggle(variant.name)}
              className={`relative text-left rounded-[6px] border overflow-hidden transition ${on ? 'border-[var(--color-violet)] ring-2 ring-[var(--color-violet)]/35' : 'border-[var(--color-line-strong)] hover:border-white/30'}`}
            >
              <span className="block aspect-square bg-[#f4f4f6]">
                <ItemImage src={variant.imageUrl} alt="" className={`w-full h-full object-contain p-1.5 ${variant.soldOut ? 'opacity-50' : ''}`} />
              </span>
              <span className="block px-2 py-1.5">
                <span className="block text-[12px] font-semibold leading-tight truncate">{variant.name}</span>
                <span className="block text-[11px] dim tnum truncate">{variant.soldOut ? 'Sold out' : shown?.local ?? ''}</span>
              </span>
              {on && (
                <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[var(--color-violet)] flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
