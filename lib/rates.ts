import type { Rates } from './money';

/**
 * Exchange rates: ECB reference rates from Frankfurter, with open.er-api as a
 * fallback. Refreshed every six hours per process; on failure the last good
 * rates stay in use, and with none at all prices simply show unconverted.
 */

const TTL_MS = 6 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __serikaWishlistRates: { rates: Rates; fetchedAt: number } | undefined;
  // eslint-disable-next-line no-var
  var __serikaWishlistRatesPending: Promise<Rates | null> | undefined;
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
    return response.ok ? ((await response.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function load(): Promise<Rates | null> {
  const ecb = await fetchJson('https://api.frankfurter.dev/v1/latest?base=EUR');
  if (ecb?.rates && typeof ecb.rates === 'object') {
    return { perEur: { EUR: 1, ...(ecb.rates as Record<string, number>) }, date: String(ecb.date ?? '') };
  }
  const er = await fetchJson('https://open.er-api.com/v6/latest/EUR');
  if (er?.rates && typeof er.rates === 'object') {
    return { perEur: { ...(er.rates as Record<string, number>), EUR: 1 }, date: String(er.time_last_update_utc ?? '') };
  }
  return null;
}

export async function getRates(): Promise<Rates | null> {
  const cached = globalThis.__serikaWishlistRates;
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.rates;
  globalThis.__serikaWishlistRatesPending ??= load().finally(() => {
    globalThis.__serikaWishlistRatesPending = undefined;
  });
  const fresh = await globalThis.__serikaWishlistRatesPending;
  if (fresh) {
    globalThis.__serikaWishlistRates = { rates: fresh, fetchedAt: Date.now() };
    return fresh;
  }
  return cached?.rates ?? null;
}
