import type { Concept, Page, Region, VillaListResponse } from './types';
import type { VillaDetail } from './villaApi';

const API = process.env.API_URL ?? 'http://localhost:4000/api';

export type VillaPublicDetail = Omit<
  VillaDetail,
  'commissionRate' | 'reviewNote' | 'reviewedAt' | 'hostId' | 'status' | 'blockedDates'
> & {
  blockedDates: { startDate: string; endDate: string }[];
};

export async function getPageBySlug(slug: string): Promise<Page | null> {
  // ponytail: no-store — admin inline editör gelene kadar tasarım iterasyonu için.
  // Yayına çıkarken revalidate + admin kaydında on-demand revalidate'e çevrilecek.
  const res = await fetch(`${API}/pages/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Sayfa yüklenemedi (${slug}): ${res.status}`);
  return res.json();
}

export async function getPage(slug: string): Promise<Page> {
  const page = await getPageBySlug(slug);
  if (!page) throw new Error(`Sayfa bulunamadı (${slug})`);
  return page;
}

export async function getVillaBySlug(slug: string): Promise<VillaPublicDetail | null> {
  const res = await fetch(`${API}/villas/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Villa yüklenemedi (${slug}): ${res.status}`);
  return res.json();
}

export type VillaListParams = {
  q?: string;
  bolge?: string;
  konsept?: string;
  guests?: number;
  adults?: number;
  children?: number;
  infants?: number;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
};

export class VillaListError extends Error {}

export async function listVillas(params: VillaListParams): Promise<VillaListResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const res = await fetch(`${API}/villas?${qs}`, { cache: 'no-store' });
  if (res.status === 400) {
    const body = await res.json();
    throw new VillaListError(typeof body.message === 'string'
      ? body.message
      : 'Filtreleri kontrol edin. Misafir sayısı ve sayfa numarası geçerli bir tam sayı olmalı.');
  }
  if (!res.ok) throw new Error(`Villalar yüklenemedi: ${res.status}`);
  return res.json();
}

export type AvailabilityResult = {
  from: string;
  to: string;
  available: boolean;
  nights: number;
  minimumNights: number;
  reasons: Array<'SALES_PAUSED' | 'DATES_UNAVAILABLE' | 'MIN_STAY' | 'CHECKIN_DAY' | 'CAPACITY_EXCEEDED'>;
};

export async function getVillaAvailability(
  slug: string,
  params: { from: string; to: string; adults?: number; children?: number; infants?: number },
): Promise<AvailabilityResult> {
  const qs = new URLSearchParams(Object.entries(params).filter((entry) => entry[1] !== undefined).map(([key, value]) => [key, String(value)]));
  const res = await fetch(`${API}/villas/${encodeURIComponent(slug)}/availability?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Müsaitlik kontrol edilemedi: ${res.status}`);
  return res.json();
}

export type VillaFilterOption = Pick<Region, 'id' | 'slug' | 'name'>;

export async function getVillaFilterOptions() {
  const [regions, concepts] = await Promise.all(['regions', 'concepts'].map(async (path) => {
    const res = await fetch(`${API}/${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Filtreler yüklenemedi: ${res.status}`);
    return res.json() as Promise<VillaFilterOption[]>;
  }));
  return { regions, concepts };
}

async function getTaxonomy<T>(path: 'regions' | 'concepts', slug?: string): Promise<T | null> {
  const res = await fetch(`${API}/${path}${slug ? `/${encodeURIComponent(slug)}` : ''}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path === 'regions' ? 'Bölgeler' : 'Konseptler'} yüklenemedi: ${res.status}`);
  return res.json();
}

export const listRegions = () => getTaxonomy<Region[]>('regions') as Promise<Region[]>;
export const listConcepts = () => getTaxonomy<Concept[]>('concepts') as Promise<Concept[]>;
export const getRegionBySlug = (slug: string) => getTaxonomy<Region>('regions', slug);
export const getConceptBySlug = (slug: string) => getTaxonomy<Concept>('concepts', slug);

export async function getSetting(key: string): Promise<Record<string, any>> {
  const res = await fetch(`${API}/settings/${key}`, { cache: 'no-store' });
  // Ayar okunamazsa site çökmesin — bileşenler boş objeyle de render eder.
  if (!res.ok) return {};
  return res.json();
}

export const formatPrice = (value: number, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
