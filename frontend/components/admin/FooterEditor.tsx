'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Footer from '@/components/site/Footer';
import WhatsAppButton from '@/components/site/WhatsAppButton';
import { getSetting, saveSetting } from '@/lib/adminApi';
import { FOOTER_DEFAULTS, FOOTER_FIELDS } from '@/lib/footerSchema';
import { FieldInput } from './Fields';

export default function FooterEditor() {
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting('footer')
      .then((v) => setDraft({ ...FOOTER_DEFAULTS, ...v }))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!draft || !dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveSetting('footer', draft);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }, [draft, dirty, saving]);

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

  if (error && !draft) {
    return <div className="flex h-full items-center justify-center text-[0.9rem] text-red-700">{error}</div>;
  }
  if (!draft) {
    return <div className="flex h-full items-center justify-center text-[0.9rem] text-muted">Yükleniyor…</div>;
  }

  const set = (key: string, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const wa = draft.whatsapp ?? {};

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-[0.85rem] text-muted transition-colors hover:text-ink">
            ← Sayfalar
          </Link>
          <span className="h-4 w-px bg-line" />
          <h1 className="font-display text-lg font-light text-ink">Footer &amp; iletişim</h1>
          {dirty && (
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[0.72rem] text-gold">
              kaydedilmemiş değişiklik
            </span>
          )}
          {saved && !dirty && (
            <span className="rounded-full bg-olive/15 px-2.5 py-1 text-[0.72rem] text-olive">
              kaydedildi
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-[0.8rem] text-red-700">{error}</span>}
          <Link
            href="/"
            target="_blank"
            className="text-[0.85rem] text-muted transition-colors hover:text-ink"
          >
            Sitede aç ↗
          </Link>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-full bg-ink px-5 py-2 text-[0.85rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[380px] shrink-0 space-y-6 overflow-y-auto border-r border-line bg-canvas px-4 py-5">
          {FOOTER_FIELDS.map((f) => (
            <FieldInput key={f.key} field={f} value={draft[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </aside>

        <div className="preview-root relative min-h-0 flex-1 overflow-y-auto bg-canvas">
          <div
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onSubmitCapture={(e) => e.preventDefault()}
          >
            <Footer content={draft} />
          </div>

          {/* Yüzen buton öngösterimi: panelin kendi alt kenarına yapışsın diye sticky. */}
          <div className="pointer-events-none sticky bottom-6 z-40 h-0">
            <div
              className={`flex px-6 ${wa.position === 'left' ? 'justify-start' : 'justify-end'}`}
              style={{ transform: 'translateY(-100%)' }}
            >
              <div className="pointer-events-auto">
                <WhatsAppButton config={wa} floating={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
