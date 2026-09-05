import Link from 'next/link';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  align?: 'left' | 'center';
  action?: { label: string; href: string };
}) {
  const centered = align === 'center';
  return (
    <div
      className={`reveal flex flex-col gap-6 ${
        centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'
      }`}
    >
      <div className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow text-gold">{eyebrow}</p>}
        {title && (
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-light leading-[1.1] tracking-[-0.02em] text-ink">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2 text-[0.92rem] text-ink transition-colors hover:text-gold"
        >
          {action.label}
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}

/** Bölüm kabuğu — dikey ritmi tek yerden yönetiyoruz. */
export function Shell({
  children,
  className = '',
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <section className={`py-20 lg:py-28 ${className}`}>
      <div className={`mx-auto px-6 lg:px-10 ${wide ? 'max-w-[1600px]' : 'max-w-[1320px]'}`}>
        {children}
      </div>
    </section>
  );
}
