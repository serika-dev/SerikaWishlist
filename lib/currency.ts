/** Guess an ISO currency from a price as a store prints it. Safe to import in client code. */

const SYMBOLS: [RegExp, string][] = [
  [/€/, 'EUR'], [/£/, 'GBP'], [/¥|￥|円/, 'JPY'], [/₩/, 'KRW'], [/₹/, 'INR'], [/CHF/, 'CHF'], [/A\$|AU\$/, 'AUD'],
  [/C\$|CA\$/, 'CAD'], [/R\$/, 'BRL'], [/zł/, 'PLN'], [/\bkr\b/i, 'SEK'], [/\$/, 'USD'],
];

export function currencyFromSymbol(text: string, host = ''): string | null {
  const code = text.match(/\b([A-Z]{3})\b/)?.[1];
  if (code) return code;
  for (const [pattern, currency] of SYMBOLS) {
    if (pattern.test(text)) {
      if (currency === 'USD' && /\.ca$/.test(host)) return 'CAD';
      if (currency === 'USD' && /\.com\.au$/.test(host)) return 'AUD';
      if (currency === 'SEK' && /\.(dk)$/.test(host)) return 'DKK';
      if (currency === 'SEK' && /\.(no)$/.test(host)) return 'NOK';
      return currency;
    }
  }
  return null;
}

export const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'KRW', 'BRL', 'INR', 'CNY', 'MXN'];

/** Prices arrive as numbers or as store text: "€ 1.234,56", "$1,234.56", "1 234,56". */
export function cleanPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else {
    let text = String(value).replace(/[^0-9.,]/g, '');
    if (!/\d/.test(text)) return null;
    const lastDot = text.lastIndexOf('.');
    const lastComma = text.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
      // Whichever comes last is the decimal separator.
      text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    } else if (lastComma >= 0) {
      text = /,\d{1,2}$/.test(text) && text.split(',').length === 2 ? text.replace(',', '.') : text.replace(/,/g, '');
    } else if (text.split('.').length > 2) {
      text = text.replace(/\./g, '');
    }
    n = Number(text);
  }
  if (!Number.isFinite(n) || n < 0 || n > 1e10) return null;
  return Math.round(n * 100) / 100;
}
