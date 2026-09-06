import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TaxonomyDetail from '@/components/site/TaxonomyDetail';
import { getConceptBySlug, listVillas } from '@/lib/api';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const concept = await getConceptBySlug((await params).slug);
  if (!concept) return {};
  return {
    title: `${concept.name} · Villa Kiralama`,
    description: concept.description ?? concept.subtitle ?? `${concept.name} seçkisindeki kiralık villaları keşfedin.`,
  };
}

export default async function ConceptPage({ params }: Props) {
  const { slug } = await params;
  const [concept, listing] = await Promise.all([getConceptBySlug(slug), listVillas({ konsept: slug })]);
  if (!concept) notFound();
  return <TaxonomyDetail kind="concept" item={concept} listing={listing} />;
}
