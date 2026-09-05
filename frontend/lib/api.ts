import type { Page } from './types';
import type { VillaDetail } from './villaApi';

const API = process.env.API_URL ?? 'http://localhost:4000/api';

export type VillaPublicDetail = Omit<VillaDetail, 'reviewNote' | 'reviewedAt' | 'hostId'>;

export async function getPage(slug: string): Promise<Page> {
  // ponytail: no-store — admin inline editör gelene kadar tasarım iterasyonu için.
  // Yayına çıkarken revalidate + admin kaydında on-demand revalidate'e çevrilecek.
  const res = await fetch(`${API}/pages/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sayfa yüklenemedi (${slug}): ${res.status}`);
  return res.json();
}

export async function getVillaBySlug(slug: string): Promise<VillaPublicDetail | null> {
  const res = await fetch(`${API}/villas/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Villa yüklenemedi (${slug}): ${res.status}`);
  return res.json();
}

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
