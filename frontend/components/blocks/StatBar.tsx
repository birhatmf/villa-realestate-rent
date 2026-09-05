export default function StatBar({ content }: { content: Record<string, any> }) {
  const stats: { value: string; label: string }[] = content.stats ?? [];

  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-y-10 px-6 py-14 lg:grid-cols-4 lg:px-10">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`reveal px-2 text-center lg:px-8 ${
              i > 0 ? 'lg:border-l lg:border-line' : ''
            }`}
            style={{ transitionDelay: `${i * 90}ms` }}
          >
            <p className="font-display text-[clamp(2rem,3.4vw,2.9rem)] font-light leading-none tracking-tight text-ink">
              {s.value}
            </p>
            <p className="mt-3 text-[0.85rem] leading-snug text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
