'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logout } from '@/lib/authApi';
import { readSession, type SessionUser } from '@/lib/session';

const NAV = [
  { label: 'Villalar', href: '/villalar' },
  { label: 'Bölgeler', href: '/bolgeler' },
  { label: 'Konseptler', href: '/konseptler' },
  { label: 'Hakkımızda', href: '/hakkimizda' },
  { label: 'İletişim', href: '/iletisim' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);

  // Yalnızca ana sayfada tam ekran hero var; diğer sayfalarda başlık hep opak.
  const overHero = pathname === '/';

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setSession(readSession());
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const opaque = !overHero || solid || open;
  const light = !opaque;

  async function onLogout() {
    await logout().catch(() => {});
    setSession(null);
    setOpen(false);
    router.replace('/');
    router.refresh();
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        opaque ? 'border-b border-line bg-canvas/92 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-8 px-6 lg:px-10">
        <Link
          href="/"
          className={`font-display text-[1.45rem] leading-none tracking-tight transition-colors duration-500 ${
            light ? 'text-white' : 'text-ink'
          }`}
        >
          villa<span className={light ? 'text-white/60' : 'text-gold'}>sepeti</span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative text-[0.9rem] transition-colors duration-500 ${
                light ? 'text-white/85 hover:text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
              <span
                className={`absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full ${
                  light ? 'bg-white' : 'bg-gold'
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <AccountMenu session={session} light={light} onLogout={onLogout} />
          ) : (
            <>
              <Link
                href="/giris"
                className={`hidden text-[0.9rem] transition-colors duration-500 md:block ${
                  light ? 'text-white/85 hover:text-white' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Giriş
              </Link>
              <Link
                href="/kayit"
                className={`hidden rounded-full border px-5 py-2.5 text-[0.85rem] transition-all duration-500 md:inline-block ${
                  light
                    ? 'border-white/40 text-white hover:bg-white hover:text-ink'
                    : 'border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-canvas'
                }`}
              >
                Üye ol
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={open}
            className={`flex h-10 w-10 flex-col items-center justify-center gap-[5px] lg:hidden ${
              light ? 'text-white' : 'text-ink'
            }`}
          >
            <span
              className={`block h-px w-5 bg-current transition-transform duration-300 ${
                open ? 'translate-y-[3px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-px w-5 bg-current transition-transform duration-300 ${
                open ? '-translate-y-[3px] -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line bg-canvas px-6 pb-8 pt-4 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b border-line/70 py-4 font-display text-2xl text-ink"
            >
              {item.label}
            </Link>
          ))}

          {session ? (
            <>
              <Link
                href="/hesabim"
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-4 font-display text-2xl text-ink"
              >
                Hesabım
              </Link>
              {session.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="border-b border-line/70 py-4 font-display text-2xl text-ink"
                >
                  Yönetim paneli
                </Link>
              )}
              <button
                onClick={onLogout}
                className="mt-5 rounded-full border border-ink/20 px-6 py-3.5 text-center text-sm text-ink"
              >
                Çıkış yap
              </button>
            </>
          ) : (
            <>
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-4 font-display text-2xl text-ink"
              >
                Giriş
              </Link>
              <Link
                href="/kayit"
                onClick={() => setOpen(false)}
                className="mt-5 rounded-full bg-ink px-6 py-3.5 text-center text-sm text-canvas"
              >
                Üye ol
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

function AccountMenu({
  session,
  light,
  onLogout,
}: {
  session: SessionUser;
  light: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const first = session.name.split(' ')[0];

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 text-[0.85rem] transition-all duration-500 ${
          light
            ? 'border-white/40 text-white hover:bg-white/10'
            : 'border-ink/20 text-ink hover:border-ink'
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-[0.75rem] ${
            light ? 'bg-white/20 text-white' : 'bg-sand-deep text-ink'
          }`}
        >
          {first.charAt(0).toLocaleUpperCase('tr-TR')}
        </span>
        {first}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] w-52 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.3)]">
          <MenuLink href="/hesabim" onClick={() => setOpen(false)}>
            Hesabım
          </MenuLink>
          {session.role === 'ADMIN' && (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              Yönetim paneli
            </MenuLink>
          )}
          <div className="my-1.5 h-px bg-line" />
          <button
            onClick={onLogout}
            className="block w-full px-4 py-2.5 text-left text-[0.88rem] text-muted transition-colors hover:bg-sand hover:text-ink"
          >
            Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2.5 text-[0.88rem] text-ink-soft transition-colors hover:bg-sand hover:text-ink"
    >
      {children}
    </Link>
  );
}
