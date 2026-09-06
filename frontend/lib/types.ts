/**
 * Paylaşılan villa kartı sözleşmesi. Hem ana sayfa `featuredVillas` bloğu
 * (pages.service.ts hydrate) hem `/villalar` listelemesi (villas.service.ts
 * toCardData) bu şekli üretir — tek kart bileşeni ikisini de render eder.
 */
export type VillaCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  district: string | null;
  currency: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  images: string[];
  rating: number;
  reviewCount: number;
  priceRange: { min: number; max: number };
  region: { name: string; slug: string };
};

export type VillaListResponse = {
  items: VillaCardData[];
  total: number;
  page: number;
  pageSize: number;
};

export type Region = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  image: string;
  villaCount: number;
};

export type Concept = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  image: string;
  villaCount: number;
};

export type Section = {
  id: string;
  type: string;
  content: Record<string, any>;
};

export type Page = {
  slug: string;
  title: string;
  seo: { title: string | null; description: string | null };
  sections: Section[];
};
