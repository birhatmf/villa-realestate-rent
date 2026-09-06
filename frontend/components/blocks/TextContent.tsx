import { Shell } from './shared';

type Item = { title?: string; body?: string };

export default function TextContent({ content }: { content: Record<string, any> }) {
  const items = (Array.isArray(content.items) ? content.items : []).filter(
    (item: Item) => item?.title || item?.body,
  );

  return (
    <Shell className="pt-10 lg:pt-14">
      <article className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-24">
        <div>
          {content.intro && (
            <p className="sticky top-32 font-display text-[clamp(1.45rem,2.7vw,2.25rem)] font-light leading-[1.35] tracking-[-0.015em] text-ink-soft">
              {content.intro}
            </p>
          )}
        </div>

        <div className="divide-y divide-line border-y border-line">
          {items.map((item: Item, index: number) => (
            <section key={`${item.title ?? 'bolum'}-${index}`} className="py-8 first:pt-0 lg:py-10">
              {item.title && (
                <h2 className="font-display text-[clamp(1.45rem,2.5vw,2rem)] font-light leading-tight text-ink">
                  {item.title}
                </h2>
              )}
              {item.body && (
                <div className="mt-5 space-y-5 text-[1rem] leading-[1.8] text-muted">
                  {String(item.body)
                    .split(/\n\s*\n/)
                    .filter(Boolean)
                    .map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </article>
    </Shell>
  );
}
