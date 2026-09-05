'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Slide = { image: string; caption?: string };

export default function Hero({ content }: { content: Record<string, any> }) {
  const slides: Slide[] = content.slides ?? [];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.image}
          aria-hidden={i !== active}
          className={`absolute inset-0 transition-opacity duration-[1600ms] ease-[var(--ease-out-soft)] ${
            i === active ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={s.image}
            alt={s.caption ?? ''}
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover transition-transform duration-[9000ms] ease-linear ${
              i === active ? 'scale-110' : 'scale-100'
            }`}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/70" />

      <div className="relative mx-auto w-full max-w-[1320px] px-6 pb-12 pt-36 lg:px-10">
        <div className="max-w-3xl">
          {content.eyebrow && (
            <p className="eyebrow text-white/70">{content.eyebrow}</p>
          )}
          <h1 className="mt-6 whitespace-pre-line font-display text-[clamp(2.6rem,6.4vw,5rem)] font-light leading-[1.04] tracking-[-0.02em] text-white">
            {content.title}
          </h1>
          {content.subtitle && (
            <p className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-white/80">
              {content.subtitle}
            </p>
          )}
        </div>

        <SearchBar search={content.search} />

        {slides.length > 1 && (
          <div className="mt-10 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {slides.map((s, i) => (
                <button
                  key={s.image}
                  type="button"
                  aria-label={`${i + 1}. görsel`}
                  onClick={() => setActive(i)}
                  className={`h-px transition-all duration-500 ${
                    i === active ? 'w-14 bg-white' : 'w-7 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
            <p className="text-[0.8rem] tracking-wide text-white/60">
              {slides[active]?.caption}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SearchBar({ search }: { search?: { placeholder?: string; cta?: string } }) {
  return (
    <form
      action="/villalar"
      className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-line/60 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_0.9fr_auto]"
    >
      <Field label="Nereye">
        <input
          name="q"
          placeholder={search?.placeholder ?? 'Bölge veya villa adı'}
          className="w-full bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-muted/70"
        />
      </Field>
      <Field label="Giriş">
        <input name="from" type="date" className="w-full bg-transparent text-[0.95rem] text-ink outline-none" />
      </Field>
      <Field label="Çıkış">
        <input name="to" type="date" className="w-full bg-transparent text-[0.95rem] text-ink outline-none" />
      </Field>
      <Field label="Misafir">
        <input
          name="guests"
          type="number"
          min={1}
          max={30}
          defaultValue={2}
          className="w-full bg-transparent text-[0.95rem] text-ink outline-none"
        />
      </Field>
      <button
        type="submit"
        className="bg-ink px-8 py-5 text-[0.95rem] text-canvas transition-colors hover:bg-olive lg:px-10"
      >
        {search?.cta ?? 'Villa ara'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 bg-surface px-6 py-4 transition-colors focus-within:bg-sand/50">
      <span className="eyebrow text-muted">{label}</span>
      {children}
    </label>
  );
}
