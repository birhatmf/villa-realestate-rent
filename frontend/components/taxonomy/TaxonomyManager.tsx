'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { regionsApi, conceptsApi, type TaxonomyInput, type TaxonomyItem } from '@/lib/adminApi';

const APIS = { regions: regionsApi, concepts: conceptsApi } as const;

export default function TaxonomyManager({
  kind,
  title,
  hasDescription,
}: {
  kind: 'regions' | 'concepts';
  title: string;
  hasDescription?: boolean;
}) {
  const api = APIS[kind];
  const [items, setItems] = useState<TaxonomyItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TaxonomyItem | 'new' | null>(null);

  const load = () => api.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function move(index: number, dir: -1 | 1) {
    if (!items) return;
    const to = index + dir;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    setItems(next);
    try {
      await api.reorder(next.map((i) => i.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sıralama kaydedilemedi.');
      load();
    }
  }

  async function remove(item: TaxonomyItem) {
    if (!confirm(`"${item.name}" silinsin mi?`)) return;
    try {
      await api.remove(item.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi.');
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-gold">Envanter</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-[-0.02em] text-ink">{title}</h1>
          </div>
          <button
            onClick={() => setEditing('new')}
            className="rounded-full bg-ink px-5 py-2.5 text-[0.85rem] text-canvas transition-colors hover:bg-olive"
          >
            + Yeni ekle
          </button>
        </div>

        {error && <p className="mt-6 text-[0.88rem] text-red-700">{error}</p>}

        <div className="mt-8 divide-y divide-line border-y border-line">
          {items === null && !error && <p className="py-6 text-[0.88rem] text-muted">Yükleniyor…</p>}
          {items?.map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 py-4">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-sand-deep">
                <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] text-ink">{item.name}</p>
                <p className="truncate text-[0.8rem] text-muted">
                  {item.subtitle || '—'} · {item._count.villas} villa
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn label="Yukarı" disabled={i === 0} onClick={() => move(i, -1)}>↑</IconBtn>
                <IconBtn label="Aşağı" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</IconBtn>
                <IconBtn label="Düzenle" onClick={() => setEditing(item)}>✎</IconBtn>
                <IconBtn label="Sil" onClick={() => remove(item)}>×</IconBtn>
              </div>
            </div>
          ))}
          {items?.length === 0 && <p className="py-6 text-[0.88rem] text-muted">Henüz kayıt yok.</p>}
        </div>
      </div>

      {editing && (
        <EditDrawer
          kind={kind}
          hasDescription={!!hasDescription}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditDrawer({
  kind,
  hasDescription,
  item,
  onClose,
  onSaved,
}: {
  kind: 'regions' | 'concepts';
  hasDescription: boolean;
  item: TaxonomyItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = APIS[kind];
  const [form, setForm] = useState<TaxonomyInput>({
    name: item?.name ?? '',
    subtitle: item?.subtitle ?? '',
    description: item?.description ?? '',
    image: item?.image ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (!form.name.trim() || !form.image.trim()) {
      setError('Ad ve görsel zorunlu.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (item) await api.update(item.id, form);
      else await api.create(form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-ink/25" onClick={onClose} />
      <div className="flex w-[420px] flex-col border-l border-line bg-canvas">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display text-lg font-light text-ink">{item ? 'Düzenle' : 'Yeni kayıt'}</h2>
          <button onClick={onClose} aria-label="Kapat" className="text-muted transition-colors hover:text-ink">×</button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="eyebrow text-muted">Ad *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
            />
          </label>

          <label className="block">
            <span className="eyebrow text-muted">Alt başlık</span>
            <input
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
            />
          </label>

          {hasDescription && (
            <label className="block">
              <span className="eyebrow text-muted">Açıklama</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1.5 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
              />
            </label>
          )}

          <label className="block">
            <span className="eyebrow text-muted">Görsel URL *</span>
            <input
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
            />
            {form.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image} alt="" className="mt-2 h-28 w-full rounded-md border border-line object-cover" />
            )}
          </label>

          {error && <p className="text-[0.85rem] text-red-700">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end border-t border-line px-5 py-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-ink px-6 py-2 text-[0.85rem] text-canvas transition-colors hover:bg-olive disabled:opacity-40"
          >
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-sand-deep hover:text-ink disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}
