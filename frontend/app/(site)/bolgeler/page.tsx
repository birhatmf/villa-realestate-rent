import type { Metadata } from 'next';
import TaxonomyIndex from '@/components/site/TaxonomyIndex';
import { listRegions } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Villa bölgeleri · Villa Kiralama',
  description: 'Kaş, Kalkan, Bodrum, Fethiye ve Türkiye’nin seçkin villa bölgelerini keşfedin.',
};

export default async function RegionsPage() {
  return <TaxonomyIndex kind="region" items={await listRegions()} />;
}
