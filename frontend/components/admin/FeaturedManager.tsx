'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAdminPage,
  listFeatured,
  saveFeatured,
  type FeaturedVilla,
} from '@/lib/adminApi';
import { createVillaApi, type VillaListItem } from '@/lib/villaApi';

const MAX_SLOTS = 12;

export default function FeaturedManager() {
  const villaApi = useMemo(() => createVillaApi('admin'), []);
  const [items, setItems] = useState<FeaturedVilla[] | null>(null);
  const [savedState, setSavedState] = useState('');
  const [limit, setLimit] = useState(8);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listFeatured(), getAdminPage('home')])
      .then(([featured, home]) => {
        setItems(featured);
        setSavedState(JSON.stringify(featured));
        const block = home.sections.find((section) => section.type === 'featuredVillas');
        setLimit(Number(block?.content.limit) || 8);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Öne çıkan villalar yüklenemedi.'));
  }, []);

  const dirty = items !== null && JSON.stringify(items) !== savedState;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const add = (villa: VillaListItem) => {
    setItems((current) => [
      ...(current ?? []),
      {
        id: villa.id,
        slug: villa.slug,
        title: villa.title,
        status: villa.status,
        featuredOrder: current?.length ?? 0,
        featuredUntil: null,
        region: villa.region,
        images: villa.images,
      },
    ]);
    setPickerOpen(false);
  };

  async function save() {
    if (!items || !dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveFeatured(
        items.map((item) => ({
          villaId: item.id,
          featuredUntil: item.featuredUntil?.slice(0, 10) ?? null,
        })),
      );
      setItems(saved);
      setSavedState(JSON.stringify(saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Öne çıkanlar kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3 sm:px-6">
        <div>
          <h1 className="font-display text-lg font-light text-ink">Öne çıkan villalar</h1>
          <p className="mt-0.5 text-[0.75rem] text-muted">Ana sayfadaki reklam sırası ve yayın süresi</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="max-w-sm text-right text-[0.8rem] text-red-700">{error}</span>}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={!items || items.length >= MAX_SLOTS}
            className="rounded-full border border-ink/20 px-4 py-2 text-[0.82rem] text-ink transition-colors hover:border-ink disabled:opacity-35"
          >
            + Villa ekle
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-full bg-ink px-5 py-2 text-[0.82rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
          >
            {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-gold">Reklam vitrini</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-[-0.025em] text-ink">
                İlk karttan son karta, vitrinin akışı
              </h2>
            </div>
            <p className="shrink-0 text-[0.85rem] text-muted">
              {items?.length ?? 0} seçili · ana sayfa {limit} gösteriyor
            </p>
          </div>

          {items && items.length !== limit && (
            <p className="mt-5 rounded-lg border border-gold/25 bg-gold/8 px-4 py-3 text-[0.82rem] leading-relaxed text-ink-soft">
              {items.length > limit
                ? `Ana sayfa bloğu ${limit} villa gösterecek. Buradaki ${items.length} slotun yalnızca ilk ${limit} tanesi görünür.`
                : `${limit - items.length} slot boş. Ana sayfa şu an ${items.length} villa gösterir.`}
            </p>
          )}

          <div className="mt-8 space-y-3">
            {items?.map((item, index) => (
              <FeaturedRow
                key={item.id}
                item={item}
                index={index}
                count={items.length}
                onMove={(direction) => move(index, direction)}
                onDate={(date) =>
                  setItems((current) =>
                    current?.map((row) =>
                      row.id === item.id ? { ...row, featuredUntil: date || null } : row,
                    ) ?? null,
                  )
                }
                onRemove={() => setItems((current) => current?.filter((row) => row.id !== item.id) ?? null)}
              />
            ))}
          </div>

          {items?.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-line px-6 py-16 text-center">
              <p className="font-display text-2xl font-light text-ink">Vitrin şu an boş</p>
              <p className="mt-2 text-[0.88rem] text-muted">Ana sayfada göstermek için yayındaki bir villa ekleyin.</p>
              <button onClick={() => setPickerOpen(true)} className="mt-6 text-[0.88rem] text-olive hover:text-ink">
                İlk villayı ekle →
              </button>
            </div>
          )}

          {!items && !error && <p className="py-16 text-center text-[0.9rem] text-muted">Yükleniyor…</p>}
        </div>
      </main>

      {pickerOpen && (
        <VillaPicker
          api={villaApi}
          selectedIds={new Set(items?.map((item) => item.id))}
          onAdd={add}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function FeaturedRow({
  item,
  index,
  count,
  onMove,
  onDate,
  onRemove,
}: {
  item: FeaturedVilla;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onDate: (date: string) => void;
  onRemove: () => void;
}) {
  const date = item.featuredUntil?.slice(0, 10) ?? '';
  const expired = Boolean(item.featuredUntil && new Date(item.featuredUntil) < new Date());

  return (
    <article className="grid items-center gap-4 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[3.5rem_5rem_minmax(0,1fr)_11rem_auto] sm:p-4">
      <span className="font-display text-3xl font-light tabular-nums text-gold/70">{String(index + 1).padStart(2, '0')}</span>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sand sm:aspect-square">
        {item.images[0]?.url && <Image src={item.images[0].url} alt="" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-display text-xl font-light text-ink">{item.title}</h3>
        <p className="mt-1 text-[0.78rem] text-muted">{item.region.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {expired && <span className="rounded-full bg-red-50 px-2 py-1 text-[0.68rem] text-red-700">Süresi doldu</span>}
          {item.status !== 'PUBLISHED' && (
            <span className="rounded-full bg-sand px-2 py-1 text-[0.68rem] text-muted">Yayında değil</span>
          )}
        </div>
      </div>
      <label className="block">
        <span className="eyebrow text-muted">Bitiş tarihi</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-line bg-canvas px-2.5 py-2 text-[0.8rem] text-ink outline-none focus:border-olive-soft"
        />
        <span className="mt-1 block text-[0.68rem] text-muted">Boşsa süresiz</span>
      </label>
      <div className="flex items-center justify-end gap-1">
        <IconButton label="Yukarı taşı" disabled={index === 0} onClick={() => onMove(-1)}>↑</IconButton>
        <IconButton label="Aşağı taşı" disabled={index === count - 1} onClick={() => onMove(1)}>↓</IconButton>
        <IconButton label="Vitrinden kaldır" onClick={onRemove}>×</IconButton>
      </div>
    </article>
  );
}

function VillaPicker({
  api,
  selectedIds,
  onAdd,
  onClose,
}: {
  api: ReturnType<typeof createVillaApi>;
  selectedIds: Set<string>;
  onAdd: (villa: VillaListItem) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<VillaListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.list({ status: 'PUBLISHED', q, pageSize: 100 })
      .then((result) => setRows(result.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Villalar yüklenemedi.'));
  }, [api, q]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-ink/35" role="dialog" aria-modal="true" aria-label="Öne çıkan villa ekle">
      <button className="min-w-0 flex-1 cursor-default" onClick={onClose} aria-label="Pencereyi kapat" />
      <aside className="flex h-full w-full max-w-lg flex-col bg-canvas shadow-2xl">
        <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <div>
            <p className="font-display text-xl font-light text-ink">Villa ekle</p>
            <p className="mt-0.5 text-[0.75rem] text-muted">Yalnızca yayındaki villalar listelenir</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted hover:bg-sand hover:text-ink" aria-label="Kapat">×</button>
        </header>
        <div className="border-b border-line p-4">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Villa adı ara"
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[0.88rem] text-ink outline-none placeholder:text-muted/60 focus:border-olive-soft"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {rows?.map((villa) => {
            const selected = selectedIds.has(villa.id);
            return (
              <button
                key={villa.id}
                type="button"
                disabled={selected}
                onClick={() => onAdd(villa)}
                className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-sand/60 disabled:opacity-40"
              >
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-sand-deep">
                  {villa.images[0]?.url && <Image src={villa.images[0].url} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.88rem] text-ink">{villa.title}</span>
                  <span className="mt-1 block text-[0.75rem] text-muted">{villa.region.name}</span>
                </span>
                <span className="text-[0.75rem] text-olive">{selected ? 'Seçili' : 'Ekle →'}</span>
              </button>
            );
          })}
          {rows?.length === 0 && <p className="py-12 text-center text-[0.85rem] text-muted">Aramanıza uyan yayınlanmış villa yok.</p>}
          {!rows && !error && <p className="py-12 text-center text-[0.85rem] text-muted">Yükleniyor…</p>}
          {error && <p className="p-4 text-[0.85rem] text-red-700">{error}</p>}
        </div>
      </aside>
    </div>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-muted transition-colors hover:bg-sand hover:text-ink disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}
