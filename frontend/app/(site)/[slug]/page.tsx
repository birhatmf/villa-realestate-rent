import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderSections } from '@/components/blocks';
import { getPageBySlug } from '@/lib/api';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageBySlug((await params).slug);
  if (!page) return {};
  return {
    title: page.seo.title ?? page.title,
    description: page.seo.description ?? undefined,
  };
}

export default async function ContentPage({ params }: Props) {
  const page = await getPageBySlug((await params).slug);
  if (!page || page.slug === 'home') notFound();

  return (
    <>
      <header className="border-b border-line bg-sand/45 px-6 pb-16 pt-36 lg:px-10 lg:pb-24 lg:pt-44">
        <div className="mx-auto max-w-[1320px]">
          <p className="eyebrow text-gold">Villa Sepeti</p>
          <h1 className="mt-5 max-w-5xl font-display text-[clamp(3.2rem,8vw,7.5rem)] font-light leading-[0.95] tracking-[-0.04em] text-ink">
            {page.title}
          </h1>
        </div>
      </header>
      {renderSections(page.sections)}
    </>
  );
}
