'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { listHostApplications, type HostApplicationListResult } from '@/lib/adminApi';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Beklemede',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};
const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-gold/15 text-gold',
  APPROVED: 'bg-olive/15 text-olive',
  REJECTED: 'bg-red-100 text-red-700',
};
const OWNERSHIP_LABEL: Record<string, string> = {
  SOLE: 'Müstakil',
  SHARED: 'Hisseli',
  SITE: 'Site/Rezidans',
};

const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function HostApplicationsTable() {
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(() => params.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HostApplicationListResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await listHostApplications({ q, status, page, pageSize: 20 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Başvurular yüklenemedi.');
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => setPage(1), [q, status]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-6 py-3">
        <h1 className="font-display text-lg font-light text-ink">
          Ev sahibi başvuruları
          {data && <span className="ml-2.5 text-[0.85rem] text-muted">{data.total}</span>}
        </h1>
        {error && <span className="text-[0.8rem] text-red-700">{error}</span>}
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-6 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ad, e‑posta, telefon veya adres ara"
          className="w-80 rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-olive-soft"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors focus:border-olive-soft"
        >
          <option value="">Tüm durumlar</option>
          <option value="PENDING">Beklemede</option>
          <option value="APPROVED">Onaylandı</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-canvas">
            <tr className="border-b border-line">
              {['Başvuru sahibi', 'Adres', 'Mülkiyet', 'Belge', 'Durum', 'Tarih'].map((h) => (
                <th key={h} className="eyebrow px-6 py-3 font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id} className="border-b border-line/70 transition-colors hover:bg-sand/50">
                <td className="px-6 py-3.5">
                  <Link href={`/admin/ev-sahipleri/${a.id}`} className="block">
                    <p className="text-[0.92rem] text-ink transition-colors hover:text-gold">{a.ownerName}</p>
                    <p className="text-[0.8rem] text-muted">{a.email} · {a.phone}</p>
                  </Link>
                </td>
                <td className="max-w-[220px] truncate px-6 py-3.5 text-[0.86rem] text-muted">{a.address}</td>
                <td className="px-6 py-3.5 text-[0.86rem] text-muted">{OWNERSHIP_LABEL[a.ownershipType]}</td>
                <td className="px-6 py-3.5 text-[0.86rem] text-muted">{a._count.documents}</td>
                <td className="px-6 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-[0.72rem] ${STATUS_CLS[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-[0.86rem] text-muted">{fmt(a.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.items.length === 0 && (
          <p className="px-6 py-12 text-center text-[0.9rem] text-muted">Bu filtreye uyan başvuru yok.</p>
        )}
        {data === null && !error && (
          <p className="px-6 py-12 text-center text-[0.9rem] text-muted">Yükleniyor…</p>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-line px-6 py-3 text-[0.85rem] text-muted">
          <span>Sayfa {data.page} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-line px-3 py-1.5 transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
            >
              ← Önceki
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-line px-3 py-1.5 transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
