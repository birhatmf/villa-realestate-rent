import Image from 'next/image';
import Link from 'next/link';
import { Shell } from './shared';

export default function EditorialSplit({ content }: { content: Record<string, any> }) {
  return (
    <Shell>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="reveal relative aspect-[4/5] overflow-hidden rounded-xl bg-sand lg:aspect-[5/6]">
          <Image
            src={content.image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="reveal" style={{ transitionDelay: '120ms' }}>
          {content.eyebrow && <p className="eyebrow text-gold">{content.eyebrow}</p>}
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-light leading-[1.08] tracking-[-0.02em] text-ink">
            {content.title}
          </h2>
          <p className="mt-7 max-w-lg text-[1.05rem] leading-[1.75] text-muted">{content.body}</p>

          {content.ctaHref && (
            <Link
              href={content.ctaHref}
              className="group mt-9 inline-flex items-center gap-2 border-b border-ink/25 pb-1.5 text-[0.95rem] text-ink transition-colors hover:border-gold hover:text-gold"
            >
              {content.ctaLabel}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}
