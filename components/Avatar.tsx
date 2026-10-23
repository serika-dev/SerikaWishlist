import { displayName, initials } from '@/lib/format';

/** Avatar with an initials fallback, on Serika's violet gradient. */
export function Avatar({
  user,
  size = 32,
  className = '',
}: {
  user: { username: string; displayName?: string | null; avatar?: string | null } | null;
  size?: number;
  className?: string;
}) {
  const name = displayName(user);
  if (user?.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt=""
        width={size}
        height={size}
        className={`rounded-full object-cover border border-[var(--color-line-strong)] shrink-0 ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`rounded-full shrink-0 inline-flex items-center justify-center font-extrabold text-white select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38), background: 'linear-gradient(135deg, #a78bfa, #5b21b6)' }}
    >
      {initials(name)}
    </span>
  );
}
