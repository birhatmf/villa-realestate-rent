import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TaxonomyDetail from '@/components/site/TaxonomyDetail';
import { getRegionBySlug, listVillas } from '@/lib/api';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = await getRegionBySlug((await params).slug);
  if (!region) return {};
  return {
    title: `${region.name} kiralık villaları · Villa Kiralama`,
    description: region.subtitle ?? `${region.name} bölgesindeki seçilmiş kiralık villaları keşfedin.`,
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const [region, listing] = await Promise.all([getRegionBySlug(slug), listVillas({ bolge: slug })]);
  if (!region) notFound();
  return <TaxonomyDetail kind="region" item={region} listing={listing} />;
}
