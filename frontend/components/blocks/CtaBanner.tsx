import Image from 'next/image';
import Link from 'next/link';

export default function CtaBanner({ content }: { content: Record<string, any> }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[26rem] px-6 py-24 lg:px-10 lg:py-32">
        {content.image && (
          <Image
            src={content.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-ink/65" />

        <div className="reveal relative mx-auto max-w-[1320px]">
          <div className="max-w-2xl">
            {content.eyebrow && <p className="eyebrow text-white/60">{content.eyebrow}</p>}
            <h2 className="mt-5 font-display text-[clamp(2rem,4.2vw,3.4rem)] font-light leading-[1.08] tracking-[-0.02em] text-white">
              {content.title}
            </h2>
            {content.text && (
              <p className="mt-6 max-w-lg text-[1.02rem] leading-relaxed text-white/75">
                {content.text}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-4">
              {content.primary && (
                <Link
                  href={content.primary.href}
                  className="rounded-full bg-canvas px-8 py-3.5 text-[0.92rem] text-ink transition-colors hover:bg-gold hover:text-white"
                >
                  {content.primary.label}
                </Link>
              )}
              {content.secondary && (
                <Link
                  href={content.secondary.href}
                  className="rounded-full border border-white/40 px-8 py-3.5 text-[0.92rem] text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  {content.secondary.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
