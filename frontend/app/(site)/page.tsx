import type { Metadata } from 'next';
import { renderSections } from '@/components/blocks';
import { getPage } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  const { seo, title } = await getPage('home');
  return {
    title: seo.title ?? title,
    description: seo.description ?? undefined,
  };
}

export default async function HomePage() {
  const page = await getPage('home');
  return <>{renderSections(page.sections)}</>;
}
