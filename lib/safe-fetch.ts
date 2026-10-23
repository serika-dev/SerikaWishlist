import dns from 'node:dns';
import net from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';

/**
 * Fetching URLs that users hand us (product links, wishlists to import).
 *
 * Anything that resolves to a private, loopback, link-local or otherwise
 * internal address is refused, and the check happens in the socket's DNS
 * lookup so a hostname cannot pass the check and then rebind to 127.0.0.1.
 * Redirects are followed by hand so every hop goes through the same guard.
 */

export class FetchBlockedError extends Error {}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(lower) || lower.startsWith('64:ff9b:') || lower.startsWith('2001:db8');
}

const guardedLookup: typeof dns.lookup = ((hostname: string, options: dns.LookupOptions, callback: (...args: unknown[]) => void) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((entry) => isPrivateAddress(entry.address));
    if (bad || list.length === 0) {
      return callback(new FetchBlockedError(`Refusing to fetch an internal address (${hostname}).`));
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}) as typeof dns.lookup;

const agent = new Agent({
  connect: { lookup: guardedLookup, timeout: 8_000 },
  headersTimeout: 10_000,
  bodyTimeout: 10_000,
});

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export interface SafeResponse {
  url: string;
  status: number;
  contentType: string;
  text: string;
}

export async function safeFetch(
  input: string,
  options: { maxBytes?: number; timeoutMs?: number; headers?: Record<string, string>; accept?: string } = {}
): Promise<SafeResponse> {
  const maxBytes = options.maxBytes ?? 3_000_000;
  const deadline = AbortSignal.timeout(options.timeoutMs ?? 12_000);
  let url = input;

  for (let hop = 0; hop < 6; hop++) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new FetchBlockedError('Only http and https links can be fetched.');
    }
    if (parsed.username || parsed.password) throw new FetchBlockedError('Links with credentials are not allowed.');
    if (net.isIP(parsed.hostname.replace(/^\[|\]$/g, '')) && isPrivateAddress(parsed.hostname.replace(/^\[|\]$/g, ''))) {
      throw new FetchBlockedError('Refusing to fetch an internal address.');
    }

    const response = await undiciFetch(url, {
      dispatcher: agent,
      redirect: 'manual',
      signal: deadline,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: options.accept ?? 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers,
      },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      url = new URL(response.headers.get('location')!, url).toString();
      await response.body?.cancel().catch(() => {});
      continue;
    }

    // Read at most maxBytes; product pages can be huge and we only need the head and data blobs.
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.byteLength;
      }
      await reader.cancel().catch(() => {});
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks));
    return {
      url,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text,
    };
  }
  throw new FetchBlockedError('Too many redirects.');
}
