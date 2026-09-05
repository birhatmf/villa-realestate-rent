import { Shell } from './shared';

const PATHS: Record<string, string> = {
  shield: 'M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9-4.1-1.1-7-4.7-7-9V6l7-3z M9.2 12l2 2 3.6-3.8',
  key: 'M15 8.5a4.5 4.5 0 11-4.4 5.5L4 20.5 3.5 17l1.9-.3.3-1.9 1.9-.3.3-1.9 2.7-2.7A4.5 4.5 0 0115 8.5z M16.2 11.3h.01',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5.2l3.4 2',
  sparkle: 'M12 3l1.9 5.3L19 10.2l-5.1 1.9L12 17.4l-1.9-5.3L5 10.2l5.1-1.9L12 3z M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z',
};

export default function ValueProps({ content }: { content: Record<string, any> }) {
  const items: { icon: string; title: string; text: string }[] = content.items ?? [];

  return (
    <Shell className="border-y border-line bg-olive text-canvas">
      {content.title && (
        <h2 className="reveal max-w-2xl font-display text-[clamp(1.8rem,3.4vw,2.8rem)] font-light leading-[1.12] tracking-[-0.02em]">
          {content.title}
        </h2>
      )}

      <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <div key={item.title} className="reveal" style={{ transitionDelay: `${i * 90}ms` }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-8 w-8 text-canvas/70"
            >
              {(PATHS[item.icon] ?? PATHS.sparkle).split(' M').map((d, k) => (
                <path key={k} d={k === 0 ? d : `M${d}`} />
              ))}
            </svg>
            <h3 className="mt-6 font-display text-xl font-light">{item.title}</h3>
            <p className="mt-2.5 text-[0.93rem] leading-relaxed text-canvas/65">{item.text}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
