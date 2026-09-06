'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BLOCKS } from '@/components/blocks';
import {
  addSection,
  getAdminPage,
  previewBlock,
  removeSection,
  reorderSections,
  updateSection,
  updatePage,
  type AdminPage,
  type AdminSection,
} from '@/lib/adminApi';
import { BLOCK_SCHEMAS, DYNAMIC_TYPES, blockLabel } from '@/lib/blockSchema';
import { FieldInput } from './Fields';

type Editable = Pick<AdminSection, 'id' | 'type' | 'visible' | 'content'>;

/** Backend'in eklediği (content'te olmayan) alanlar = dinamik veri. */
const extractDynamic = (content: Record<string, any>, preview: Record<string, any>) =>
  Object.fromEntries(Object.entries(preview).filter(([k]) => !(k in content)));

export default function PageEditor({ slug }: { slug: string }) {
  const [page, setPage] = useState<AdminPage | null>(null);
  const [sections, setSections] = useState<Editable[]>([]);
  const [dynamic, setDynamic] = useState<Record<string, Record<string, any>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [orderDirty, setOrderDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [details, setDetails] = useState({ title: '', seoTitle: '', seoDescription: '' });

  const selected = sections.find((s) => s.id === selectedId) ?? null;
  const hasChanges = dirty.size > 0 || orderDirty || detailsDirty;

  // ---- yükleme -------------------------------------------------------------
  useEffect(() => {
    getAdminPage(slug)
      .then((p) => {
        setPage(p);
        setDetails({
          title: p.title,
          seoTitle: p.seoTitle ?? '',
          seoDescription: p.seoDescription ?? '',
        });
        setSections(p.sections.map(({ id, type, visible, content }) => ({ id, type, visible, content })));
        setDynamic(
          Object.fromEntries(p.sections.map((s) => [s.id, extractDynamic(s.content, s.preview)])),
        );
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  // ---- canlı öngösterim: sadece düzenlenen dinamik blok yeniden hydrate ----
  const selectedContentKey = selected ? JSON.stringify(selected.content) : '';
  useEffect(() => {
    if (!selected || !DYNAMIC_TYPES.has(selected.type)) return;
    const id = selected.id;
    const type = selected.type;
    const content = JSON.parse(selectedContentKey);
    const t = setTimeout(() => {
      previewBlock(type, content)
        .then((p) => setDynamic((prev) => ({ ...prev, [id]: extractDynamic(content, p) })))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedContentKey]);

  // ---- kaydedilmemiş değişiklik uyarısı -----------------------------------
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  // ---- mutasyonlar ---------------------------------------------------------
  const patch = useCallback((id: string, next: Partial<Editable>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
    setOrderDirty(true);
  };

  async function onAdd(type: string) {
    if (!page) return;
    setAdding(false);
    try {
      const created = await addSection(page.id, type, structuredClone(BLOCK_SCHEMAS[type].defaults));
      setSections((prev) => [
        ...prev,
        { id: created.id, type: created.type, visible: created.visible, content: created.content as any },
      ]);
      setSelectedId(created.id);
      if (DYNAMIC_TYPES.has(type)) {
        const p = await previewBlock(type, created.content as any);
        setDynamic((prev) => ({ ...prev, [created.id]: extractDynamic(created.content as any, p) }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blok eklenemedi.');
    }
  }

  async function onRemove(id: string) {
    if (!confirm('Bu blok silinsin mi? Geri alınamaz.')) return;
    try {
      await removeSection(id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blok silinemedi.');
    }
  }

  const save = useCallback(async () => {
    if (!page || !hasChanges || saving) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of dirty) {
        const s = sections.find((x) => x.id === id);
        if (s) await updateSection(id, { content: s.content, visible: s.visible });
      }
      if (orderDirty) await reorderSections(page.id, sections.map((s) => s.id));
      if (detailsDirty) {
        const saved = await updatePage(page.id, {
          title: details.title,
          seoTitle: details.seoTitle,
          seoDescription: details.seoDescription,
        });
        setPage((current) => (current ? { ...current, ...saved } : current));
      }
      setDirty(new Set());
      setOrderDirty(false);
      setDetailsDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }, [page, hasChanges, saving, dirty, sections, orderDirty, detailsDirty, details]);

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const availableBlocks = useMemo(
    () =>
      Object.entries(BLOCK_SCHEMAS).filter(
        ([type, schema]) => !schema.unique || !sections.some((s) => s.type === type),
      ),
    [sections],
  );

  if (error && !page) return <Centered>{error}</Centered>;
  if (!page) return <Centered>Yükleniyor…</Centered>;

  return (
    <div className="flex h-full flex-col">
      {/* üst bar */}
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-[0.85rem] text-muted transition-colors hover:text-ink">
            ← Sayfalar
          </Link>
          <span className="h-4 w-px bg-line" />
          <h1 className="font-display text-lg font-light text-ink">{details.title}</h1>
          {hasChanges && (
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[0.72rem] text-gold">
              kaydedilmemiş değişiklik
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-[0.8rem] text-red-700">{error}</span>}
          <button
            type="button"
            onClick={() => setEditingDetails((value) => !value)}
            className={`text-[0.85rem] transition-colors ${editingDetails ? 'text-gold' : 'text-muted hover:text-ink'}`}
          >
            Sayfa bilgileri
          </button>
          <Link
            href={page.slug === 'home' ? '/' : `/${page.slug}`}
            target="_blank"
            className="text-[0.85rem] text-muted transition-colors hover:text-ink"
          >
            Sitede aç ↗
          </Link>
          <button
            onClick={save}
            disabled={!hasChanges || saving}
            className="rounded-full bg-ink px-5 py-2 text-[0.85rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* sol panel */}
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-line bg-canvas">
          {editingDetails ? (
            <PageDetails
              slug={page.slug}
              value={details}
              onBack={() => setEditingDetails(false)}
              onChange={(next) => {
                setDetails(next);
                setDetailsDirty(true);
              }}
            />
          ) : selected ? (
            <BlockForm
              section={selected}
              onBack={() => setSelectedId(null)}
              onChange={(content) => patch(selected.id, { content })}
            />
          ) : (
            <BlockList
              sections={sections}
              onSelect={setSelectedId}
              onToggle={(s) => patch(s.id, { visible: !s.visible })}
              onMove={move}
              onRemove={onRemove}
              adding={adding}
              setAdding={setAdding}
              availableBlocks={availableBlocks}
              onAdd={onAdd}
            />
          )}
        </aside>

        {/* canlı öngösterim */}
        <div className="preview-root min-h-0 flex-1 overflow-y-auto bg-canvas">
          <div
            onClickCapture={(e) => {
              // Editörde gezinme yok: tıklama sadece blok seçer.
              e.preventDefault();
              e.stopPropagation();
            }}
            onSubmitCapture={(e) => e.preventDefault()}
          >
            {sections.map((s) => {
              const Block = BLOCKS[s.type];
              if (!Block) return null;
              const isSelected = s.id === selectedId;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`group/blk relative cursor-pointer ${s.visible ? '' : 'opacity-35 grayscale'}`}
                >
                  <Block content={{ ...s.content, ...(dynamic[s.id] ?? {}) }} />

                  <span
                    className={`pointer-events-none absolute inset-0 border-2 transition-colors ${
                      isSelected ? 'border-gold' : 'border-transparent group-hover/blk:border-gold/40'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute left-0 top-0 bg-gold px-2.5 py-1 text-[0.7rem] tracking-wide text-white transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover/blk:opacity-100'
                    }`}
                  >
                    {blockLabel(s.type)}
                    {!s.visible && ' · gizli'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PageDetails({
  slug,
  value,
  onBack,
  onChange,
}: {
  slug: string;
  value: { title: string; seoTitle: string; seoDescription: string };
  onBack: () => void;
  onChange: (next: { title: string; seoTitle: string; seoDescription: string }) => void;
}) {
  const inputClass =
    'mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors focus:border-olive-soft';

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3.5">
        <button onClick={onBack} className="text-[0.85rem] text-muted hover:text-ink" aria-label="Bloklara dön">
          ←
        </button>
        <div>
          <p className="text-[0.92rem] text-ink">Sayfa bilgileri</p>
          <p className="text-[0.75rem] text-muted">Başlık ve arama motoru görünümü</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <label className="block">
          <span className="eyebrow text-muted">Sayfa başlığı</span>
          <input
            required
            minLength={2}
            maxLength={100}
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="eyebrow text-muted">Sayfa adresi</span>
          <input value={`/${slug}`} readOnly className={`${inputClass} cursor-not-allowed bg-sand/50 text-muted`} />
          <span className="mt-1 block text-[0.75rem] text-muted">Bağlantılar bozulmasın diye adres sabit tutulur.</span>
        </label>
        <label className="block">
          <span className="eyebrow text-muted">SEO başlığı</span>
          <input
            maxLength={160}
            value={value.seoTitle}
            placeholder={value.title}
            onChange={(e) => onChange({ ...value, seoTitle: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="eyebrow text-muted">SEO açıklaması</span>
          <textarea
            rows={5}
            maxLength={320}
            value={value.seoDescription}
            onChange={(e) => onChange({ ...value, seoDescription: e.target.value })}
            className={`${inputClass} resize-y leading-relaxed`}
          />
          <span className="mt-1 block text-right text-[0.72rem] text-muted">{value.seoDescription.length}/320</span>
        </label>
      </div>
    </>
  );
}

function BlockList({
  sections,
  onSelect,
  onToggle,
  onMove,
  onRemove,
  adding,
  setAdding,
  availableBlocks,
  onAdd,
}: {
  sections: Editable[];
  onSelect: (id: string) => void;
  onToggle: (s: Editable) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  adding: boolean;
  setAdding: (v: boolean) => void;
  availableBlocks: [string, (typeof BLOCK_SCHEMAS)[string]][];
  onAdd: (type: string) => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-line px-5 py-4">
        <p className="eyebrow text-muted">Bloklar</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {sections.map((s, i) => (
          <div
            key={s.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-sand/60"
          >
            <button
              onClick={() => onSelect(s.id)}
              className="min-w-0 flex-1 text-left"
              title="Düzenle"
            >
              <span className={`block truncate text-[0.9rem] ${s.visible ? 'text-ink' : 'text-muted line-through'}`}>
                {blockLabel(s.type)}
              </span>
              <span className="block truncate text-[0.75rem] text-muted">
                {BLOCK_SCHEMAS[s.type]?.description ?? s.type}
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Mini label="Yukarı" disabled={i === 0} onClick={() => onMove(i, -1)}>↑</Mini>
              <Mini label="Aşağı" disabled={i === sections.length - 1} onClick={() => onMove(i, 1)}>↓</Mini>
              <Mini label={s.visible ? 'Gizle' : 'Göster'} onClick={() => onToggle(s)}>
                {s.visible ? '◉' : '○'}
              </Mini>
              <Mini label="Sil" onClick={() => onRemove(s.id)}>×</Mini>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        {adding ? (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-line bg-surface p-1">
            {availableBlocks.map(([type, schema]) => (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="block w-full rounded px-3 py-2 text-left transition-colors hover:bg-sand"
              >
                <span className="block text-[0.88rem] text-ink">{schema.label}</span>
                <span className="block text-[0.75rem] text-muted">{schema.description}</span>
              </button>
            ))}
            <button
              onClick={() => setAdding(false)}
              className="mt-1 w-full px-3 py-2 text-[0.8rem] text-muted transition-colors hover:text-ink"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-lg border border-dashed border-line py-2.5 text-[0.85rem] text-muted transition-colors hover:border-olive-soft hover:text-ink"
          >
            + Blok ekle
          </button>
        )}
      </div>
    </>
  );
}

function BlockForm({
  section,
  onBack,
  onChange,
}: {
  section: Editable;
  onBack: () => void;
  onChange: (content: Record<string, any>) => void;
}) {
  const schema = BLOCK_SCHEMAS[section.type];

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3.5">
        <button
          onClick={onBack}
          className="text-[0.85rem] text-muted transition-colors hover:text-ink"
          aria-label="Blok listesine dön"
        >
          ←
        </button>
        <div className="min-w-0">
          <p className="truncate text-[0.92rem] text-ink">{schema?.label ?? section.type}</p>
          <p className="truncate text-[0.75rem] text-muted">{schema?.description}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {schema ? (
          schema.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={section.content?.[f.key]}
              onChange={(v) => onChange({ ...section.content, [f.key]: v })}
            />
          ))
        ) : (
          <p className="text-[0.85rem] text-muted">
            Bu blok tipi için form tanımı yok ({section.type}).
          </p>
        )}
      </div>
    </>
  );
}

function Mini({
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
      className="flex h-7 w-7 items-center justify-center rounded text-[0.8rem] text-muted transition-colors hover:bg-sand-deep hover:text-ink disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full items-center justify-center text-[0.9rem] text-muted">{children}</div>
);
