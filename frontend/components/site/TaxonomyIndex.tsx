import Image from 'next/image';
import Link from 'next/link';
import type { Concept, Region } from '@/lib/types';

type Props = {
  kind: 'region' | 'concept';
  items: (Region | Concept)[];
};

export default function TaxonomyIndex({ kind, items }: Props) {
  const isRegion = kind === 'region';
  const base = isRegion ? 'bolgeler' : 'konseptler';

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-10 lg:pt-40">
      <nav aria-label="İçerik yolu" className="mb-10 flex items-center gap-3 text-xs text-muted">
        <Link href="/" className="hover:text-ink">Ana sayfa</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{isRegion ? 'Bölgeler' : 'Konseptler'}</span>
      </nav>

      <header className="mb-12 grid gap-7 lg:grid-cols-[1fr_0.65fr] lg:items-end">
        <div>
          <p className="eyebrow text-olive">{isRegion ? 'Rotanızı seçin' : 'Tatilinizi seçin'}</p>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.7rem,6vw,5rem)] font-light leading-[1.02] tracking-tight">
            {isRegion ? <>Her kıyının <em className="text-olive">başka bir ritmi var.</em></> : <>Nasıl bir tatil <em className="text-olive">hayal ediyorsunuz?</em></>}
          </h1>
        </div>
        <p className="max-w-md text-sm leading-7 text-muted">
          {isRegion
            ? 'Sakin koylardan taş sokaklara, göl kıyısından Ege rüzgârına uzanan seçilmiş rotaları keşfedin.'
            : 'Balayı, denize sıfır, kış konaklaması veya tam mahremiyet. Size uyan seçkiden başlayın.'}
        </p>
      </header>

      <section aria-label={isRegion ? 'Villa bölgeleri' : 'Villa konseptleri'} className="grid auto-rows-[17rem] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={`/${base}/${item.slug}`}
            style={{ transitionDelay: `${Math.min(index, 5) * 60}ms` }}
            className={`reveal group relative overflow-hidden rounded-xl bg-sand-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive ${index === 0 ? 'sm:row-span-2 lg:col-span-2' : ''}`}
          >
            <Image
              src={item.image}
              alt=""
              fill
              priority={index === 0}
              sizes={index === 0 ? '(max-width: 640px) 100vw, 66vw' : '(max-width: 640px) 100vw, 33vw'}
              className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white lg:p-8">
              <div>
                <p className="eyebrow text-white/65">{item.villaCount} villa</p>
                <h2 className={`mt-2 font-display font-light leading-none ${index === 0 ? 'text-4xl lg:text-6xl' : 'text-3xl'}`}>{item.name}</h2>
                {item.subtitle && <p className="mt-3 max-w-sm text-sm text-white/75">{item.subtitle}</p>}
              </div>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 transition-colors group-hover:bg-white group-hover:text-ink">→</span>
            </div>
          </Link>
        ))}
      </section>

      <div className="mt-14 border-t border-line pt-8 text-center">
        <Link href="/villalar" className="inline-flex min-h-12 items-center rounded-lg bg-ink px-7 py-3 text-sm text-canvas transition-colors hover:bg-olive">Tüm villaları görün <span aria-hidden="true" className="ml-3">→</span></Link>
      </div>
    </div>
  );
}
