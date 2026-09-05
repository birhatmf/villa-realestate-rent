import Image from 'next/image';
import Link from 'next/link';

/** Giriş ve kayıt sayfalarının ortak kabuğu: solda form, sağda tam boy görsel. */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  image,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
      <div className="flex items-center justify-center px-6 pb-20 pt-32 lg:px-16">
        <div className="w-full max-w-md">
          <p className="eyebrow text-gold">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,4vw,3.2rem)] font-light leading-[1.1] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">{subtitle}</p>

          {children}

          <p className="mt-8 text-[0.9rem] text-muted">{footer}</p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image src={image} alt="" fill sizes="45vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-ink/20" />
      </div>
    </div>
  );
}

export const fieldCls =
  'mt-2 w-full border-b border-ink/25 bg-transparent pb-2 text-[0.98rem] text-ink outline-none transition-colors focus:border-ink';

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-ink underline underline-offset-4 transition-colors hover:text-gold">
      {children}
    </Link>
  );
}
