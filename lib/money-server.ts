import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { currencyForCountry, DISPLAY_CURRENCIES, type MoneyPrefs } from './money';

export const CURRENCY_COOKIE = 'serika_wishlist_currency';

/**
 * The viewer's display currency and locale. A currency they picked wins; else
 * the country Cloudflare reports for their connection; else the region in
 * their browser language; else USD. The locale only shapes number formatting.
 */
export const getMoneyPrefs = cache(async (): Promise<MoneyPrefs> => {
  const [store, head] = await Promise.all([cookies(), headers()]);
  const language = head.get('accept-language')?.split(',')[0]?.split(';')[0]?.trim() || 'en-US';
  let locale = 'en-US';
  try {
    locale = Intl.getCanonicalLocales(language)[0] ?? 'en-US';
  } catch {
    locale = 'en-US';
  }

  const picked = store.get(CURRENCY_COOKIE)?.value?.toUpperCase();
  if (picked && DISPLAY_CURRENCIES.includes(picked)) return { locale, currency: picked };

  const fromCountry = currencyForCountry(head.get('cf-ipcountry'));
  const fromLanguage = currencyForCountry(locale.split('-')[1]);
  const currency = [fromCountry, fromLanguage].find((c) => c && DISPLAY_CURRENCIES.includes(c)) || 'USD';
  return { locale, currency };
});
