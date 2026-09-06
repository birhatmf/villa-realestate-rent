import VillaCard from '@/components/site/VillaCard';
import type { VillaCardData } from '@/lib/types';
import { SectionHeading, Shell } from './shared';

export default function FeaturedVillas({ content }: { content: Record<string, any> }) {
  const villas: VillaCardData[] = content.villas ?? [];
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
