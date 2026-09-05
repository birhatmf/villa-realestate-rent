'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listHostApplications, listPages, listUsers, type AdminUser } from '@/lib/adminApi';

type PageRow = Awaited<ReturnType<typeof listPages>>[number];

export default function AdminOverview() {
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [users, setUsers] = useState<{ total: number; items: AdminUser[] } | null>(null);
  const [pendingApps, setPendingApps] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPages(), listUsers({ pageSize: 5 }), listHostApplications({ status: 'PENDING', pageSize: 1 })])
      .then(([p, u, apps]) => {
        setPages(p);
        setUsers({ total: u.total, items: u.items });
        setPendingApps(apps.total);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-14">
        <p className="eyebrow text-gold">Yönetim</p>
        <h1 className="mt-3 font-display text-4xl font-light tracking-[-0.02em] text-ink">
          Genel bakış
        </h1>

        {error && <p className="mt-8 text-[0.9rem] text-red-700">{error}</p>}

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Stat label="Sayfa" value={pages?.length} href="/admin/pages" />
          <Stat label="Üye" value={users?.total} href="/admin/uyeler" />
          <Stat label="Bekleyen ev sahibi başvurusu" value={pendingApps ?? undefined} href="/admin/ev-sahipleri?status=PENDING" />
        </div>

        <section className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow text-muted">Son üyeler</h2>
            <Link
              href="/admin/uyeler"
              className="text-[0.85rem] text-muted transition-colors hover:text-ink"
            >
              Tümü →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {users?.items.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-[0.95rem] text-ink">{u.name}</p>
                  <p className="truncate text-[0.82rem] text-muted">{u.email}</p>
                </div>
                <span className="shrink-0 text-[0.8rem] text-muted">
                  {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            ))}
            {users?.items.length === 0 && (
              <p className="py-5 text-[0.88rem] text-muted">Henüz üye yok.</p>
            )}
            {users === null && !error && (
              <p className="py-5 text-[0.88rem] text-muted">Yükleniyor…</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value?: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-surface px-6 py-6 transition-colors hover:border-ink/25"
    >
      <p className="font-display text-4xl font-light leading-none text-ink">
        {value ?? '—'}
      </p>
      <p className="mt-2.5 text-[0.85rem] text-muted">{label}</p>
    </Link>
  );
}
