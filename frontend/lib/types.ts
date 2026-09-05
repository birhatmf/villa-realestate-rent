export type Villa = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  district: string | null;
  pricePerNight: number;
  currency: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  images: string[];
  amenities: string[];
  rating: number;
  reviewCount: number;
  region: { name: string; slug: string };
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
