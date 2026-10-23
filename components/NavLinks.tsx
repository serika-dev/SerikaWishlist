'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/lists', label: 'My lists', match: (p: string) => p.startsWith('/lists') || p.startsWith('/w/') },
  { href: '/friends', label: 'Friends', match: (p: string) => p.startsWith('/friends') || p.startsWith('/u/') },
  { href: '/import', label: 'Import', match: (p: string) => p.startsWith('/import') },
  { href: '/bookmarklet', label: 'Bookmarklet', match: (p: string) => p.startsWith('/bookmarklet') },
];

export function NavLinks() {
  const pathname = usePathname() || '/';
  return (
    <nav className="flex items-center gap-5 sm:gap-7 h-full min-w-0 overflow-x-auto scroll-row">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} data-active={link.match(pathname)} className="nav-link shrink-0">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
