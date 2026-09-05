import Link from 'next/link';
import SocialIcon from './SocialIcon';

type FooterLink = { label?: string; href?: string };
type FooterContent = {
  brand?: { description?: string };
  newsletter?: { enabled?: boolean; title?: string; text?: string; placeholder?: string; cta?: string };
  columns?: { title?: string; links?: FooterLink[] }[];
  contact?: {
    title?: string;
    address?: string;
    phone?: string;
    email?: string;
    mapUrl?: string;
    mapLabel?: string;
  };
  social?: { platform?: string; url?: string }[];
  legal?: FooterLink[];
  copyright?: string;
};

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const valid = (l?: FooterLink) => l?.label && l?.href;

export default function Footer({ content = {} }: { content?: FooterContent }) {
  const { brand, newsletter, columns = [], contact, social = [], legal = [], copyright } = content;
  const socials = social.filter((s) => s.platform && s.url);

  return (
    <footer className="border-t border-line bg-sand/60">
      {newsletter?.enabled !== false && (newsletter?.title || newsletter?.cta) && (
        <div className="border-b border-ink/10 bg-sand-deep/50">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="max-w-lg">
              {newsletter.title && (
                <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-light leading-tight tracking-[-0.02em] text-ink">
                  {newsletter.title}
                </h2>
              )}
              {newsletter.text && (
                <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{newsletter.text}</p>
              )}
            </div>

            <form className="w-full max-w-md shrink-0">
              <div className="flex items-center gap-3 border-b border-ink/30 pb-2.5 transition-colors focus-within:border-ink">
                <input
                  type="email"
                  required
                  aria-label={newsletter.placeholder || 'E‑posta adresiniz'}
                  placeholder={newsletter.placeholder || 'E‑posta adresiniz'}
                  className="w-full bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-muted/70"
                />
                <button
                  type="submit"
                  className="shrink-0 whitespace-nowrap text-[0.88rem] text-ink transition-colors hover:text-gold"
                >
                  {newsletter.cta || 'Kaydol'} →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1320px] px-6 py-20 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Link href="/" className="font-display text-3xl leading-none tracking-tight text-ink">
              villa<span className="text-gold">sepeti</span>
            </Link>

            {brand?.description && (
              <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-muted">
                {brand.description}
              </p>
            )}

            {(contact?.address || contact?.phone || contact?.email) && (
              <div className="mt-8">
                {contact.title && <h3 className="eyebrow text-muted">{contact.title}</h3>}
                <address className="mt-4 space-y-2 text-[0.93rem] not-italic leading-relaxed text-ink-soft">
                  {contact.address && <p className="max-w-xs">{contact.address}</p>}
                  {contact.phone && (
                    <p>
                      <a href={telHref(contact.phone)} className="transition-colors hover:text-gold">
                        {contact.phone}
                      </a>
                    </p>
                  )}
                  {contact.email && (
                    <p>
                      <a href={`mailto:${contact.email}`} className="transition-colors hover:text-gold">
                        {contact.email}
                      </a>
                    </p>
                  )}
                </address>

                {contact.mapUrl && (
                  <a
                    href={contact.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-4 inline-flex items-center gap-1.5 border-b border-ink/25 pb-1 text-[0.88rem] text-ink transition-colors hover:border-gold hover:text-gold"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="h-4 w-4"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
                      <circle cx="12" cy="10" r="2.8" />
                    </svg>
                    {contact.mapLabel || 'Haritada göster'}
                  </a>
                )}
              </div>
            )}

            {socials.length > 0 && (
              <div className="mt-8 flex items-center gap-2.5">
                {socials.map((s) => (
                  <a
                    key={`${s.platform}-${s.url}`}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-canvas"
                  >
                    <SocialIcon platform={s.platform!} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {columns.length > 0 && (
            <div className="grid gap-10 sm:grid-cols-3">
              {columns.map((col, i) => (
                <div key={col.title ?? i}>
                  {col.title && <h3 className="eyebrow text-muted">{col.title}</h3>}
                  <ul className="mt-5 space-y-3">
                    {(col.links ?? []).filter(valid).map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href!}
                          className="text-[0.95rem] text-ink-soft transition-colors hover:text-gold"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-ink/10 pt-8 text-[0.85rem] text-muted lg:flex-row lg:items-center lg:justify-between">
          {copyright && <p>{copyright.replace('{year}', String(new Date().getFullYear()))}</p>}
          {legal.filter(valid).length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {legal.filter(valid).map((l) => (
                <Link key={l.href} href={l.href!} className="transition-colors hover:text-ink">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
