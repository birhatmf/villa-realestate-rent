'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ADMIN_NAV, NAV_ICONS } from '@/lib/adminNav';
import { logout } from '@/lib/authApi';
import { readSession } from '@/lib/session';

const STORAGE_KEY = 'mv_admin_sidebar';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* özel sekme / site verisi kapalı — varsayılanla devam */
    }
    setName(readSession()?.name ?? null);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* yoksay */
      }
      return next;
    });
  }

  async function onLogout() {
    await logout().catch(() => {});
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-line bg-sand/40 transition-[width] duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[236px]'
      }`}
    >
      <div className="flex h-[57px] shrink-0 items-center gap-2 border-b border-line px-4">
        <Link
          href="/"
          target="_blank"
          title="Siteyi yeni sekmede aç"
          className="min-w-0 flex-1 truncate font-display text-[1.1rem] leading-none tracking-tight text-ink"
        >
          {collapsed ? 'v' : (
            <>
              villa<span className="text-gold">sepeti</span>
            </>
          )}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4">
        {ADMIN_NAV.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="eyebrow px-2.5 pb-2 text-muted/70">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);

                const inner = (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="h-[1.15rem] w-[1.15rem] shrink-0"
                    >
                      {(NAV_ICONS[item.icon] ?? '').split(' M').map((d, i) => (
                        <path key={i} d={i === 0 ? d : `M${d}`} />
                      ))}
                    </svg>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.soon && (
                      <span className="ml-auto shrink-0 rounded-full bg-sand-deep px-1.5 py-0.5 text-[0.62rem] tracking-wide text-muted">
                        yakında
                      </span>
                    )}
                  </>
                );

                const base =
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.88rem] transition-colors';

                return (
                  <li key={item.href}>
                    {item.soon ? (
                      <span
                        title={collapsed ? `${item.label} · yakında` : undefined}
                        aria-disabled
                        className={`${base} cursor-not-allowed text-muted/45`}
                      >
                        {inner}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`${base} ${
                          active
                            ? 'bg-ink text-canvas'
                            : 'text-ink-soft hover:bg-sand-deep/60 hover:text-ink'
                        }`}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line px-2.5 py-3">
        {!collapsed && name && (
          <p className="truncate px-2.5 pb-2 text-[0.78rem] text-muted">{name}</p>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'Çıkış yap' : undefined}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.85rem] text-muted transition-colors hover:bg-sand-deep/60 hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="h-[1.15rem] w-[1.15rem] shrink-0"
          >
            <path d="M14 4.5h4a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-4" />
            <path d="M10 8l-4 4 4 4" />
            <path d="M6 12h9" />
          </svg>
          {!collapsed && 'Çıkış yap'}
        </button>
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.85rem] text-muted transition-colors hover:bg-sand-deep/60 hover:text-ink"
        >
          <span className="flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center">
            {collapsed ? '›' : '‹'}
          </span>
          {!collapsed && 'Daralt'}
        </button>
      </div>
    </aside>
  );
}
