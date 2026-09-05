import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/api';
import FavoriteButton from '@/components/site/FavoriteButton';
import type { Villa } from '@/lib/types';
import { SectionHeading, Shell } from './shared';

export default function FeaturedVillas({ content }: { content: Record<string, any> }) {
  const villas: Villa[] = content.villas ?? [];
  if (!villas.length) return null;

  return (
    <Shell className="bg-sand/45">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        action={
          content.ctaHref ? { label: content.ctaLabel ?? 'Tümü', href: content.ctaHref } : undefined
        }
      />

      <div className="mt-14 grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {villas.map((v, i) => (
          <VillaCard key={v.id} villa={v} delay={(i % 3) * 90} />
        ))}
      </div>
    </Shell>
  );
}

function VillaCard({ villa, delay }: { villa: Villa; delay: number }) {
  return (
    <Link
      href={`/villalar/${villa.slug}`}
      style={{ transitionDelay: `${delay}ms` }}
      className="reveal group block"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand-deep">
        <Image
          src={villa.images[0]}
          alt={villa.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-105"
        />
        {villa.images[1] && (
          <Image
            src={villa.images[1]}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          />
        )}
        <FavoriteButton villaId={villa.id} className="absolute right-3 top-3" />
        <div className="absolute left-4 top-4 rounded-full bg-canvas/90 px-3 py-1.5 text-[0.72rem] tracking-wide text-ink backdrop-blur-sm">
          ★ {villa.rating.toFixed(1)}
          <span className="text-muted"> · {villa.reviewCount}</span>
        </div>
      </div>

      <div className="pt-5">
        <p className="eyebrow text-muted">
          {villa.region.name}
          {villa.district ? ` · ${villa.district}` : ''}
        </p>
        <h3 className="mt-2.5 font-display text-2xl font-light leading-tight tracking-tight text-ink transition-colors group-hover:text-gold">
          {villa.title}
        </h3>
        {villa.summary && (
          <p className="mt-2 line-clamp-2 text-[0.93rem] leading-relaxed text-muted">
            {villa.summary}
          </p>
        )}

        <div className="mt-5 flex items-center gap-4 text-[0.83rem] text-muted">
          <span>{villa.capacity} kişi</span>
          <Dot />
          <span>{villa.bedrooms} oda</span>
          <Dot />
          <span>{villa.bathrooms} banyo</span>
        </div>

        <div className="mt-4 flex items-baseline gap-1.5 border-t border-line pt-4">
          <span className="font-display text-xl text-ink">
            {formatPrice(villa.pricePerNight, villa.currency)}
          </span>
          <span className="text-[0.83rem] text-muted">/ gece</span>
        </div>
      </div>
    </Link>
  );
}

const Dot = () => <span className="h-1 w-1 rounded-full bg-line" />;
