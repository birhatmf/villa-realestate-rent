import Image from 'next/image';
import Link from 'next/link';
import type { Region } from '@/lib/types';
import { SectionHeading, Shell } from './shared';

export default function RegionGrid({ content }: { content: Record<string, any> }) {
  const regions: Region[] = content.regions ?? [];
  if (!regions.length) return null;

  const [lead, ...rest] = regions;

  return (
    <Shell>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.title}
        action={{ label: 'Tüm bölgeler', href: '/bolgeler' }}
      />

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card region={lead} className="col-span-2 row-span-2 aspect-square md:aspect-auto" featured />
        {rest.map((r, i) => (
          <Card key={r.id} region={r} className="aspect-[4/5]" delay={(i + 1) * 60} />
        ))}
      </div>
    </Shell>
  );
}

function Card({
  region,
  className = '',
  featured = false,
  delay = 0,
}: {
  region: Region;
  className?: string;
  featured?: boolean;
  delay?: number;
}) {
  return (
    <Link
      href={`/bolgeler/${region.slug}`}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal group relative overflow-hidden rounded-xl bg-sand ${className}`}
    >
      <Image
        src={region.image}
        alt={region.name}
        fill
        sizes={featured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
        className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.07]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
        <p className="eyebrow text-white/60">{region.villaCount} villa</p>
        <h3
          className={`mt-2 font-display font-light leading-tight text-white ${
            featured ? 'text-[clamp(1.8rem,3vw,2.6rem)]' : 'text-xl md:text-2xl'
          }`}
        >
          {region.name}
        </h3>
        {region.subtitle && (
          <p className="mt-1.5 max-w-xs text-[0.85rem] leading-snug text-white/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            {region.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
