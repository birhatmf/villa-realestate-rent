'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listPages } from '@/lib/adminApi';

type Row = Awaited<ReturnType<typeof listPages>>[number];

export default function AdminPagesList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPages().then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-14">
        <p className="eyebrow text-gold">İçerik</p>
        <h1 className="mt-3 font-display text-4xl font-light tracking-[-0.02em] text-ink">
          Sayfalar
        </h1>

        {error && <p className="mt-8 text-[0.9rem] text-red-700">{error}</p>}

        <div className="mt-12 divide-y divide-line border-y border-line">
          {rows === null && !error && <p className="py-6 text-[0.9rem] text-muted">Yükleniyor…</p>}
          {rows?.map((p) => (
            <Link
              key={p.id}
              href={`/admin/pages/${p.slug}`}
              className="group flex items-center justify-between gap-6 py-6"
            >
              <div>
                <h2 className="font-display text-2xl font-light text-ink transition-colors group-hover:text-gold">
                  {p.title}
                </h2>
                <p className="mt-1.5 text-[0.85rem] text-muted">
                  /{p.slug === 'home' ? '' : p.slug} · {p._count.sections} blok · son güncelleme{' '}
                  {new Date(p.updatedAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <span className="text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
