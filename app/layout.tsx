import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { MoneyProvider } from '@/components/Money';
import { ToastProvider } from '@/components/Toaster';
import { config } from '@/lib/config';
import { getMoneyPrefs } from '@/lib/money-server';
import { getRates } from '@/lib/rates';

/** Outfit is Serika's brand typeface (serika.moe/brand); it carries everything here. */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(config.BASE_URL),
  title: {
    default: 'Serika Wishlist',
    template: '%s · Serika Wishlist',
  },
  description:
    'Wishlists from any store. Add things with one click, share one link, and let people gift without spoiling the surprise.',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Serika Wishlist',
    description: 'Wishlists from any store, with one link to share.',
    siteName: 'Serika Wishlist',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [prefs, rates] = await Promise.all([getMoneyPrefs(), getRates()]);
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <div className="sky" aria-hidden="true" />
        <MoneyProvider prefs={prefs} rates={rates}>
          <ToastProvider>{children}</ToastProvider>
        </MoneyProvider>
      </body>
    </html>
  );
}
