import Link from 'next/link';

/** The text logo: Serika in white, Wishlist in violet. Stands on its own, never next to the icon. */
export function Wordmark({ size = 22, href = '/' }: { size?: number; href?: string | null }) {
  const mark = (
    <span className="wordmark leading-none" style={{ fontSize: size }}>
      Serika<b>Wishlist</b>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="Serika Wishlist home" className="inline-flex items-center">
      {mark}
    </Link>
  ) : (
    mark
  );
}
