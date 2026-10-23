/**
 * Money shown to a viewer: converted into their currency and formatted for
 * their locale, with the store's own price kept alongside. Pure functions,
 * shared by server and client components.
 */

export interface Rates {
  /** Units of each currency per 1 EUR. EUR itself is 1. */
  perEur: Record<string, number>;
  date: string;
}

export interface MoneyPrefs {
  locale: string;
  currency: string;
}

export function convert(amount: number, from: string | null | undefined, to: string, rates: Rates | null): number | null {
  const source = (from || 'EUR').toUpperCase();
  if (source === to) return amount;
  if (!rates) return null;
  const fromRate = source === 'EUR' ? 1 : rates.perEur[source];
  const toRate = to === 'EUR' ? 1 : rates.perEur[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

export function formatIn(amount: number, currency: string, locale: string): string {
  try {
    const whole = Math.abs(amount) >= 1000 || Number.isInteger(amount);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: whole ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export interface PriceDisplay {
  /** In the viewer's currency (converted when needed). */
  local: string;
  /** The store's price, when it is in another currency. */
  original: string | null;
  converted: boolean;
}

/** How one price reads for this viewer. Falls back to the store price when there's no rate. */
export function displayPrice(
  amount: number | null | undefined,
  currency: string | null | undefined,
  prefs: MoneyPrefs,
  rates: Rates | null
): PriceDisplay | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
  const source = (currency || 'EUR').toUpperCase();
  const store = formatIn(amount, source, prefs.locale);
  if (source === prefs.currency) return { local: store, original: null, converted: false };
  const local = convert(amount, source, prefs.currency, rates);
  if (local === null) return { local: store, original: null, converted: false };
  return { local: formatIn(local, prefs.currency, prefs.locale), original: store, converted: true };
}

/** Sum prices in mixed currencies into the viewer's currency. Unconvertible ones are skipped. */
export function sumIn(
  entries: { amount: number; currency: string | null | undefined }[],
  prefs: MoneyPrefs,
  rates: Rates | null
): { total: number; skipped: number } {
  let total = 0;
  let skipped = 0;
  for (const entry of entries) {
    const value = convert(entry.amount, entry.currency, prefs.currency, rates);
    if (value === null) skipped++;
    else total += value;
  }
  return { total, skipped };
}

/** Where people mostly pay in which currency. Anything else falls back to USD. */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', JP: 'JPY', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', LI: 'CHF', SE: 'SEK', NO: 'NOK',
  DK: 'DKK', IS: 'ISK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', TR: 'TRY', KR: 'KRW', CN: 'CNY', HK: 'HKD',
  SG: 'SGD', MY: 'MYR', TH: 'THB', PH: 'PHP', ID: 'IDR', IN: 'INR', IL: 'ILS', ZA: 'ZAR', BR: 'BRL', MX: 'MXN',
};
const EURO_AREA = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
  'AD', 'MC', 'SM', 'VA', 'ME', 'XK', 'BG',
]);

export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = country.toUpperCase();
  if (EURO_AREA.has(code)) return 'EUR';
  return COUNTRY_CURRENCY[code] ?? null;
}

/** The currencies we have rates for, for the picker. */
export const DISPLAY_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON',
  'TRY', 'KRW', 'CNY', 'HKD', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'INR', 'ILS', 'ZAR', 'BRL', 'MXN',
];
