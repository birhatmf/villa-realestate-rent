import Image from 'next/image';
import Link from 'next/link';
import VillaCard from '@/components/site/VillaCard';
import type { Concept, Region, VillaListResponse } from '@/lib/types';

export default function TaxonomyDetail({ kind, item, listing }: {
  kind: 'region' | 'concept';
  item: Region | Concept;
  listing: VillaListResponse;
}) {
  const isRegion = kind === 'region';
  const base = isRegion ? 'bolgeler' : 'konseptler';
  const filter = isRegion ? `bolge=${encodeURIComponent(item.slug)}` : `konsept=${encodeURIComponent(item.slug)}`;
  const description = 'description' in item ? item.description : null;

  return (
    <div className="pb-24">
      <header className="relative min-h-[34rem] overflow-hidden bg-ink pt-28 text-white lg:min-h-[42rem]">
        <Image src={item.image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <div className="relative mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-between px-6 pb-12 pt-8 lg:min-h-[34rem] lg:px-10 lg:pb-16">
          <nav aria-label="İçerik yolu" className="flex items-center gap-3 text-xs text-white/70">
            <Link href="/" className="hover:text-white">Ana sayfa</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${base}`} className="hover:text-white">{isRegion ? 'Bölgeler' : 'Konseptler'}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{item.name}</span>
          </nav>
          <div className="max-w-4xl">
            <p className="eyebrow text-white/65">{isRegion ? 'Villa bölgesi' : 'Villa konsepti'} · {item.villaCount} villa</p>
            <h1 className="mt-4 font-display text-[clamp(3.5rem,9vw,7.5rem)] font-light leading-[0.92] tracking-tight">{item.name}</h1>
            {item.subtitle && <p className="mt-5 font-display text-2xl font-light text-white/85 lg:text-3xl">{item.subtitle}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-16 lg:px-10 lg:pt-24">
        <div className="mb-12 flex flex-col gap-6 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow text-olive">Seçili villalar</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-light leading-tight">{item.name} için ayırdığımız evler</h2>
            {description && <p className="mt-5 text-base leading-8 text-muted">{description}</p>}
          </div>
          <Link href={`/villalar?${filter}`} className="inline-flex min-h-12 shrink-0 items-center self-start rounded-lg border border-line px-5 py-3 text-sm transition-colors hover:border-olive hover:text-olive lg:self-auto">Tarih ve misafir seçin <span aria-hidden="true" className="ml-3">→</span></Link>
        </div>

        {listing.items.length ? (
          <div className="grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {listing.items.map((villa, index) => <VillaCard key={villa.id} villa={villa} delay={(index % 3) * 90} />)}
          </div>
        ) : (
          <div className="rounded-2xl bg-sand/50 px-6 py-20 text-center">
            <h2 className="font-display text-3xl font-light">Bu seçkide henüz yayınlanmış villa yok.</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">Yeni evler hazırlanırken diğer bölgeleri ve konseptleri keşfedebilirsiniz.</p>
            <Link href="/villalar" className="mt-7 inline-block rounded-lg bg-ink px-6 py-3.5 text-sm text-canvas hover:bg-olive">Tüm villaları gör</Link>
          </div>
        )}
      </main>
    </div>
  );
}
