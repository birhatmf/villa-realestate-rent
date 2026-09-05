import { SectionHeading, Shell } from './shared';

export default function Testimonials({ content }: { content: Record<string, any> }) {
  const items: { quote: string; author: string; meta?: string }[] = content.items ?? [];

  return (
    <Shell>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} align="center" />

      <div className="mt-16 grid gap-x-8 gap-y-12 md:grid-cols-3">
        {items.map((t, i) => (
          <figure
            key={t.author}
            className="reveal flex flex-col border-t border-line pt-8"
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            <span aria-hidden className="font-display text-4xl leading-none text-gold/50">
              &ldquo;
            </span>
            <blockquote className="mt-4 flex-1 font-display text-[1.15rem] font-light leading-[1.6] tracking-[-0.01em] text-ink-soft">
              {t.quote}
            </blockquote>
            <figcaption className="mt-7">
              <p className="text-[0.92rem] text-ink">{t.author}</p>
              {t.meta && <p className="mt-1 text-[0.82rem] text-muted">{t.meta}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </Shell>
  );
}
