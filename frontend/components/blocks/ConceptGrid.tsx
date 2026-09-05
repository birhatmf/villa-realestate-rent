import Image from 'next/image';
import Link from 'next/link';
import type { Concept } from '@/lib/types';
import { SectionHeading, Shell } from './shared';

/** RegionGrid'in asimetrik ızgarasının aksine bilinçli olarak eşit 4'lü —
 * ana sayfaya bölüm bölüm farklı bir ritim katmak için. */
export default function ConceptGrid({ content }: { content: Record<string, any> }) {
  const concepts: Concept[] = content.concepts ?? [];
  if (!concepts.length) return null;

  return (
    <Shell className="bg-sand/45">
      <SectionHeading eyebrow={content.eyebrow} title={content.title} align="center" />

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {concepts.map((c, i) => (
          <Card key={c.id} concept={c} delay={i * 70} />
        ))}
      </div>
    </Shell>
  );
}

function Card({ concept, delay = 0 }: { concept: Concept; delay?: number }) {
  return (
    <Link
      href={`/konseptler/${concept.slug}`}
      style={{ transitionDelay: `${delay}ms` }}
      className="reveal group relative aspect-[3/4] overflow-hidden rounded-xl bg-sand-deep"
    >
      <Image
        src={concept.image}
        alt={concept.name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.07]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
        <p className="eyebrow text-white/60">{concept.villaCount} villa</p>
        <h3 className="mt-2 font-display text-xl font-light leading-tight text-white md:text-2xl">
          {concept.name}
        </h3>
        {concept.subtitle && (
          <p className="mt-1.5 max-w-[16rem] text-[0.85rem] leading-snug text-white/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            {concept.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
