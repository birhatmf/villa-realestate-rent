'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, me, type AccountUser } from '@/lib/authApi';
import { formatPrice } from '@/lib/api';
import { listFavorites, removeFavorite, type FavoriteVilla } from '@/lib/favoritesApi';

export default function HesabimPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => router.replace('/giris?next=/hesabim'));
  }, [router]);

  async function onLogout() {
    await logout().catch(() => {});
    router.replace('/');
    router.refresh();
  }

  if (error) return <Centered>{error}</Centered>;
  if (!user) return <Centered>Yükleniyor…</Centered>;

  return (
    <div className="mx-auto max-w-3xl px-6 pb-28 pt-36 lg:px-10">
      <p className="eyebrow text-gold">Hesabım</p>
      <h1 className="mt-4 font-display text-[clamp(2.2rem,4vw,3.2rem)] font-light leading-tight tracking-[-0.02em] text-ink">
        Merhaba, {user.name.split(' ')[0]}
      </h1>

      <dl className="mt-14 divide-y divide-line border-y border-line">
        <Row label="Ad soyad" value={user.name} />
        <Row label="E‑posta" value={user.email} />
        <Row label="Telefon" value={user.phone || '—'} />
        <Row
          label="Üyelik tarihi"
          value={new Date(user.createdAt).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        />
      </dl>

      {user.role === 'HOST' || user.role === 'ADMIN' ? (
        <div className="mt-14 flex flex-col items-start gap-4 rounded-xl border border-line bg-sand/30 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-light text-ink">Villalarım</h2>
            <p className="mt-1.5 text-[0.9rem] text-muted">
              Villalarınızı ekleyin, düzenleyin, fotoğraf ve fiyat kurallarını yönetin.
            </p>
          </div>
          <Link
            href="/hesabim/villalarim"
            className="shrink-0 rounded-full bg-ink px-6 py-3 text-[0.9rem] text-canvas transition-colors hover:bg-olive"
          >
            Villalarımı yönet
          </Link>
        </div>
      ) : (
        <div className="mt-14 rounded-xl border border-dashed border-line px-6 py-8 text-center">
          <p className="text-[0.95rem] text-muted">
            Bir villanız mı var? Portföyümüze ekleyip misafirlerle buluşturalım.
          </p>
          <Link
            href="/ev-sahibi"
            className="mt-4 inline-block text-[0.9rem] text-ink underline underline-offset-4 transition-colors hover:text-gold"
          >
            Ev sahibi başvurusu yapın
          </Link>
        </div>
      )}

      <FavoritesSection />

      <div className="mt-12 flex flex-wrap items-center gap-6">
        {user.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="rounded-full border border-ink/20 px-6 py-3 text-[0.9rem] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-canvas"
          >
            Yönetim paneli
          </Link>
        )}
        <button
          onClick={onLogout}
          className="text-[0.9rem] text-muted transition-colors hover:text-ink"
        >
          Çıkış yap
        </button>
      </div>
    </div>
  );
}

function FavoritesSection() {
  const [favorites, setFavorites] = useState<FavoriteVilla[] | null>(null);

  useEffect(() => {
    listFavorites()
      .then(setFavorites)
      .catch(() => setFavorites([]));
  }, []);

  async function onRemove(id: string) {
    setFavorites((prev) => prev?.filter((f) => f.id !== id) ?? null);
    await removeFavorite(id).catch(() => {});
  }

  if (favorites === null) return null;

  return (
    <div className="mt-14">
      <h2 className="eyebrow text-muted">Favorilerim</h2>
      {favorites.length === 0 ? (
        <p className="mt-4 text-[0.9rem] text-muted">
          Henüz favori villanız yok.{' '}
          <Link href="/" className="text-ink underline underline-offset-4 hover:text-gold">
            Villaları keşfedin
          </Link>
          .
        </p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {favorites.map((v) => (
            <div key={v.id} className="group relative overflow-hidden rounded-xl border border-line">
              <Link href={`/villalar/${v.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-sand-deep">
                  {v.images[0] && <Image src={v.images[0].url} alt={v.title} fill sizes="50vw" className="object-cover" />}
                </div>
                <div className="p-4">
                  <p className="text-[0.8rem] text-muted">{v.region.name}</p>
                  <p className="mt-1 text-[0.95rem] text-ink">{v.title}</p>
                  <p className="mt-1 text-[0.85rem] text-muted">
                    {v.priceRange.min === v.priceRange.max
                      ? formatPrice(v.priceRange.min, v.currency)
                      : `${formatPrice(v.priceRange.min, v.currency)} – ${formatPrice(v.priceRange.max, v.currency)}`}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => onRemove(v.id)}
                aria-label="Favorilerden çıkar"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-canvas/90 text-ink transition-colors hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="text-[0.98rem] text-ink">{value}</dd>
    </div>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-[60vh] items-center justify-center text-[0.9rem] text-muted">
    {children}
  </div>
);
