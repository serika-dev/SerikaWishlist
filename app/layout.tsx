import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toaster';
import { config } from '@/lib/config';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <div className="sky" aria-hidden="true" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
