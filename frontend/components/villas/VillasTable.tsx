'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listRegions } from '@/lib/adminApi';
import { createVillaApi, type VillaListResult } from '@/lib/villaApi';
import { BUILDING_TYPE_LABEL, VILLA_STATUS_CLS, VILLA_STATUS_LABEL } from '@/lib/villaSchema';
import { formatPrice } from '@/lib/api';

export default function VillasTable({
  scope,
  editHref,
  newHref,
  title,
  initialStatus = '',
}: {
  scope: 'admin' | 'host';
  editHref: (id: string) => string;
  newHref: string;
  title: string;
  initialStatus?: string;
}) {
  const api = useMemo(() => createVillaApi(scope), [scope]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<VillaListResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRegions().then(setRegions).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.list({ q, status, regionId, page, pageSize: 20 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Villalar yüklenemedi.');
    }
  }, [api, q, status, regionId, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => setPage(1), [q, status, regionId]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-6 py-3">
        <h1 className="font-display text-lg font-light text-ink">
          {title}
          {data && <span className="ml-2.5 text-[0.85rem] text-muted">{data.total}</span>}
        </h1>
        <div className="flex items-center gap-3">
          {error && <span className="text-[0.8rem] text-red-700">{error}</span>}
          <Link href={newHref} className="rounded-full bg-ink px-4 py-2 text-[0.82rem] text-canvas transition-colors hover:bg-olive">
            + Yeni villa
          </Link>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-6 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Villa adı ara"
          className="w-64 rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-olive-soft"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none focus:border-olive-soft">
          <option value="">Tüm durumlar</option>
          <option value="DRAFT">Taslak</option>
          <option value="PENDING_REVIEW">İncelemede</option>
          <option value="PUBLISHED">Yayında</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
        {scope === 'admin' && (
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none focus:border-olive-soft">
            <option value="">Tüm bölgeler</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-canvas">
            <tr className="border-b border-line">
              {['Villa', 'Bölge', 'Tip', 'Fiyat', 'Görsel', 'Durum'].map((h) => (
                <th key={h} className="eyebrow px-6 py-3 font-medium text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((v) => (
              <tr key={v.id} className="border-b border-line/70 transition-colors hover:bg-sand/50">
                <td className="px-6 py-3">
                  <Link href={editHref(v.id)} className="flex items-center gap-3">
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-sand-deep">
                      {v.images[0] && <Image src={v.images[0].url} alt="" fill sizes="64px" className="object-cover" />}
                    </div>
                    <span className="text-[0.9rem] text-ink transition-colors hover:text-gold">{v.title}</span>
                  </Link>
                </td>
                <td className="px-6 py-3 text-[0.85rem] text-muted">{v.region.name}</td>
                <td className="px-6 py-3 text-[0.85rem] text-muted">{v.bedrooms} oda · {v.capacity} kişi</td>
                <td className="px-6 py-3 text-[0.85rem] text-muted">{formatPrice(v.pricePerNight, v.currency)}</td>
                <td className="px-6 py-3 text-[0.85rem] text-muted">{v._count.images}</td>
                <td className="px-6 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[0.72rem] ${VILLA_STATUS_CLS[v.status]}`}>
                    {VILLA_STATUS_LABEL[v.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.items.length === 0 && (
          <p className="px-6 py-12 text-center text-[0.9rem] text-muted">Bu filtreye uyan villa yok.</p>
        )}
        {data === null && !error && <p className="px-6 py-12 text-center text-[0.9rem] text-muted">Yükleniyor…</p>}
      </div>

      {data && totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-line px-6 py-3 text-[0.85rem] text-muted">
          <span>Sayfa {data.page} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-line px-3 py-1.5 transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35">← Önceki</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-line px-3 py-1.5 transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35">Sonraki →</button>
          </div>
        </div>
      )}
    </div>
  );
}
