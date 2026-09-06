import type { Metadata } from 'next';
import TaxonomyIndex from '@/components/site/TaxonomyIndex';
import { listConcepts } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Villa konseptleri · Villa Kiralama',
  description: 'Denize sıfır, balayı, kış ve korunaklı villa seçkilerini keşfedin.',
};

export default async function ConceptsPage() {
  return <TaxonomyIndex kind="concept" items={await listConcepts()} />;
}
