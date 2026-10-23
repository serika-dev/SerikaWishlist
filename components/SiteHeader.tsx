import { getViewer } from '@/lib/viewer';
import { NavLinks } from './NavLinks';
import { UserMenu } from './UserMenu';
import { Wordmark } from './Wordmark';

export async function SiteHeader() {
  const { user, guest } = await getViewer();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 h-16 flex items-center gap-6 sm:gap-10">
        <div className="shrink-0">
          <Wordmark size={21} />
        </div>
        <div className="hidden md:flex h-full min-w-0 flex-1">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <UserMenu user={user} guest={guest && !guest.claimedUserId ? guest : null} />
        </div>
      </div>
      <div className="md:hidden h-11 border-t border-[var(--color-line)] px-4 [&_.nav-link]:h-11">
        <NavLinks />
      </div>
    </header>
  );
}
