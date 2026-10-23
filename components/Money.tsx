'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { displayPrice, DISPLAY_CURRENCIES, formatIn, sumIn, type MoneyPrefs, type Rates } from '@/lib/money';

interface MoneyApi {
  prefs: MoneyPrefs;
  rates: Rates | null;
  price: (amount: number | null | undefined, currency: string | null | undefined) => ReturnType<typeof displayPrice>;
  total: (entries: { amount: number; currency: string | null | undefined }[]) => string | null;
  format: (amount: number, currency: string) => string;
}

const MoneyContext = createContext<MoneyApi | null>(null);

export function MoneyProvider({ prefs, rates, children }: { prefs: MoneyPrefs; rates: Rates | null; children: React.ReactNode }) {
  const api = useMemo<MoneyApi>(
    () => ({
      prefs,
      rates,
      price: (amount, currency) => displayPrice(amount, currency, prefs, rates),
      total: (entries) => {
        if (entries.length === 0) return null;
        const { total } = sumIn(entries, prefs, rates);
        return formatIn(total, prefs.currency, prefs.locale);
      },
      format: (amount, currency) => formatIn(amount, currency, prefs.locale),
    }),
    [prefs, rates]
  );
  return <MoneyContext.Provider value={api}>{children}</MoneyContext.Provider>;
}

export function useMoney(): MoneyApi {
  const api = useContext(MoneyContext);
  if (!api) throw new Error('useMoney needs a MoneyProvider');
  return api;
}

/**
 * A price in the viewer's currency, with the store's own price underneath
 * when they differ ("$34" over "€30.42 at the store").
 */
export function Price({
  amount,
  currency,
  size = 'md',
  className = '',
}: {
  amount: number | null | undefined;
  currency: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { price } = useMoney();
  const shown = price(amount, currency);
  if (!shown) return <span className={`text-[13px] dim ${className}`}>No price</span>;
  const main = size === 'lg' ? 'text-[30px]' : size === 'sm' ? 'text-[13px]' : 'text-[16px]';
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className={`${main} font-extrabold text-[var(--color-violet-lift)] tnum`} title={shown.converted ? 'Converted at today’s exchange rate' : undefined}>
        {shown.converted && size !== 'lg' ? '≈ ' : ''}
        {shown.local}
      </span>
      {shown.original && (
        <span className={`${size === 'lg' ? 'text-[13px] mt-1' : 'text-[11.5px] mt-0.5'} dim tnum`}>{shown.original} at the store</span>
      )}
    </span>
  );
}

/** Lets people pick the currency prices are shown in. Remembered for a year. */
export function CurrencyPicker({ className = '' }: { className?: string }) {
  const { prefs } = useMoney();
  const router = useRouter();
  const pick = useCallback(
    (currency: string) => {
      document.cookie = `serika_wishlist_currency=${currency}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
      router.refresh();
    },
    [router]
  );
  return (
    <label className={`inline-flex items-center gap-2 text-[12.5px] muted ${className}`}>
      <span>Prices in</span>
      <select
        className="field !h-8 !w-auto !py-0 !pl-2.5 !pr-7 !text-[12.5px] ![background-position:calc(100%-14px)_14px,calc(100%-9px)_14px]"
        value={prefs.currency}
        onChange={(e) => pick(e.target.value)}
        aria-label="Currency for prices"
      >
        {DISPLAY_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
