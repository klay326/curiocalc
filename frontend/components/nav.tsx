'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-mono transition-colors ${
        pathname === href ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span className="text-lg">🧮</span>
          <span>CurioCalc</span>
        </Link>

        <div className="flex items-center gap-5">
          {link('/', 'Browse')}
          {user ? (
            <>
              {link('/collection', 'My Collection')}
              <span className="text-zinc-600 font-mono text-sm hidden sm:block">
                @{user.username}
              </span>
              <button
                onClick={logout}
                className="text-sm font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {link('/login', 'Sign in')}
              <Link
                href="/register"
                className="text-sm font-mono bg-amber-400 text-zinc-950 px-3 py-1.5 rounded-md font-bold hover:bg-amber-300 transition-colors"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
