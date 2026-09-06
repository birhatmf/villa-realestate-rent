'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPage, listPages } from '@/lib/adminApi';

type Row = Awaited<ReturnType<typeof listPages>>[number];

export default function AdminPagesList() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    listPages().then(setRows).catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const page = await createPage({ title, slug });
      router.push(`/admin/pages/${page.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sayfa oluşturulamadı.');
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-14">
        <p className="eyebrow text-gold">İçerik</p>
        <div className="mt-3 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-light tracking-[-0.02em] text-ink">Sayfalar</h1>
            <p className="mt-3 max-w-xl text-[0.9rem] leading-relaxed text-muted">
              Kurumsal ve bilgilendirme sayfalarını bloklarla oluşturup yönetin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-[0.85rem] text-canvas transition-colors hover:bg-olive"
          >
            {creating ? 'Vazgeç' : '+ Yeni sayfa'}
          </button>
        </div>

        {creating && (
          <form onSubmit={onCreate} className="mt-8 grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow text-muted">Sayfa adı</span>
              <input
                required
                minLength={2}
                maxLength={100}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(toSlug(e.target.value));
                }}
                placeholder="Hakkımızda"
                className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-2.5 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
              />
            </label>
            <label className="block">
              <span className="eyebrow text-muted">Sayfa adresi</span>
              <input
                required
                maxLength={100}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(toSlug(e.target.value));
                }}
                placeholder="hakkimizda"
                className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-2.5 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
              />
              <span className="mt-1 block text-[0.75rem] text-muted">
                /{slug || 'sayfa-adresi'} · oluşturulduğunda sitede görünür
              </span>
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || !title.trim() || !slug}
                className="rounded-full bg-olive px-5 py-2.5 text-[0.85rem] text-white transition-colors hover:bg-ink disabled:opacity-40"
              >
                {saving ? 'Oluşturuluyor…' : 'Sayfayı oluştur'}
              </button>
            </div>
          </form>
        )}

        {error && <p className="mt-8 text-[0.9rem] text-red-700">{error}</p>}

        <div className="mt-12 divide-y divide-line border-y border-line">
          {rows === null && !error && <p className="py-6 text-[0.9rem] text-muted">Yükleniyor…</p>}
          {rows?.length === 0 && (
            <p className="py-8 text-[0.9rem] text-muted">Henüz sayfa yok. İlk sayfanızı oluşturun.</p>
          )}
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

function toSlug(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
