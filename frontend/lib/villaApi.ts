'use client';

import { req } from './http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type VillaStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export type VillaRoom = {
  id?: string;
  bedType: string;
  bedCount: number;
  hasEnsuite: boolean;
  hasJacuzzi: boolean;
  note?: string | null;
};

export type VillaImage = {
  id: string;
  category: string;
  url: string;
  order: number;
  isCover: boolean;
  width: number | null;
  height: number | null;
};

export type VillaPriceRule = {
  id: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  minNights: number | null;
};

export type VillaBlockedDate = {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
};

/** Form gönderirken kullanılan şekil — scalar alanların tamamı, oda listesi dahil. */
export type VillaFormInput = {
  title: string;
  summary?: string;
  regionId: string;
  district?: string;
  buildingType: string;
  permitNumber?: string;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  bedrooms: number;
  bathrooms: number;
  poolType: string;
  poolSecluded: boolean;
  poolHeated: boolean;
  poolHeatingIncluded: boolean;
  poolHeatingFeePerDay?: number;
  poolHasChildPool: boolean;
  poolLengthM?: number;
  poolWidthM?: number;
  poolDepthM?: number;
  wifiMbps?: number;
  beachDistanceM?: number;
  nearCenter: boolean;
  viewTags: string[];
  amenities: string[];
  pricePerNight: number;
  currency: string;
  minNights: number;
  cleaningFee: number;
  cleaningFeeThresholdNights: number;
  depositAmount: number;
  utilitiesIncluded: boolean;
  gasIncluded: boolean;
  extraCleaningFee?: number;
  petPolicy: string;
  petNote?: string;
  familiesOnly: boolean;
  allowSingleMaleGroups: boolean;
  allowYoungGroups: boolean;
  eventsAllowed: boolean;
  smokingAllowed: boolean;
  customRules: string[];
  checkInTime: string;
  checkOutTime: string;
  checkInWeekday: number | null;
  videoUrl?: string;
  commissionRate?: number;
  rooms: VillaRoom[];
  conceptIds: string[];
};

export type VillaDetail = Omit<VillaFormInput, 'conceptIds'> & {
  id: string;
  concepts: { id: string; name: string; slug: string }[];
  priceRange: { min: number; max: number };
  rating: number;
  reviewCount: number;
  slug: string;
  status: VillaStatus;
  hostId: string | null;
  capacity: number;
  reviewNote: string | null;
  reviewedAt: string | null;
  images: VillaImage[];
  priceRules: VillaPriceRule[];
  blockedDates: VillaBlockedDate[];
  region: { name: string; slug: string };
};

export type VillaListItem = {
  id: string;
  slug: string;
  title: string;
  status: VillaStatus;
  pricePerNight: number;
  currency: string;
  capacity: number;
  bedrooms: number;
  region: { name: string; slug: string };
  images: { url: string }[];
  priceRange: { min: number; max: number };
  _count: { images: number };
};

export type VillaListResult = {
  items: VillaListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export const DEFAULT_VILLA_FORM: VillaFormInput = {
  title: '',
  summary: '',
  regionId: '',
  district: '',
  buildingType: 'DETACHED',
  maxAdults: 2,
  maxChildren: 0,
  maxInfants: 0,
  bedrooms: 1,
  bathrooms: 1,
  poolType: 'NONE',
  poolSecluded: false,
  poolHeated: false,
  poolHeatingIncluded: true,
  poolHasChildPool: false,
  nearCenter: false,
  viewTags: [],
  amenities: [],
  pricePerNight: 0,
  currency: 'TRY',
  minNights: 1,
  cleaningFee: 0,
  depositAmount: 0,
  cleaningFeeThresholdNights: 7,
  utilitiesIncluded: true,
  gasIncluded: true,
  petPolicy: 'NOT_ALLOWED',
  familiesOnly: false,
  allowSingleMaleGroups: true,
  allowYoungGroups: true,
  eventsAllowed: false,
  smokingAllowed: false,
  customRules: [],
  checkInTime: '16:00',
  checkOutTime: '10:00',
  checkInWeekday: null,
  rooms: [],
  conceptIds: [],
};

/** admin ve host sayfaları aynı fonksiyon setini farklı taban yoldan çağırır. */
export function createVillaApi(scope: 'admin' | 'host') {
  const base = `/${scope}/villas`;

  return {
    list: (params: { status?: string; regionId?: string; q?: string; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') qs.set(k, String(v));
      }
      return req<VillaListResult>(`${base}?${qs}`);
    },

    get: (id: string) => req<VillaDetail>(`${base}/${id}`),

    create: (data: VillaFormInput) =>
      req<VillaDetail>(base, { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Partial<VillaFormInput>) =>
      req<VillaDetail>(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    remove: (id: string) => req<{ ok: true }>(`${base}/${id}`, { method: 'DELETE' }),

    submit: (id: string) => req<VillaDetail>(`${base}/${id}/submit`, { method: 'PATCH' }),

    review: (id: string, status: 'PUBLISHED' | 'REJECTED', reviewNote?: string) =>
      req<VillaDetail>(`/admin/villas/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNote }),
      }),

    async uploadImage(villaId: string, category: string, file: File, dims?: { width?: number; height?: number }) {
      const form = new FormData();
      form.append('category', category);
      if (dims?.width) form.append('width', String(dims.width));
      if (dims?.height) form.append('height', String(dims.height));
      form.append('file', file);
      const res = await fetch(`${API}${base}/${villaId}/images`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? `Görsel yüklenemedi (${res.status})`);
      }
      return res.json() as Promise<VillaImage>;
    },

    updateImage: (villaId: string, imageId: string, data: { order?: number; isCover?: boolean }) =>
      req<VillaImage>(`${base}/${villaId}/images/${imageId}`, { method: 'PATCH', body: JSON.stringify(data) }),

    removeImage: (villaId: string, imageId: string) =>
      req<{ ok: true }>(`${base}/${villaId}/images/${imageId}`, { method: 'DELETE' }),

    addPriceRule: (villaId: string, data: { startDate: string; endDate: string; pricePerNight: number; minNights?: number }) =>
      req<VillaPriceRule>(`${base}/${villaId}/price-rules`, { method: 'POST', body: JSON.stringify(data) }),

    removePriceRule: (villaId: string, ruleId: string) =>
      req<{ ok: true }>(`${base}/${villaId}/price-rules/${ruleId}`, { method: 'DELETE' }),

    addBlockedDate: (villaId: string, data: { startDate: string; endDate: string; note?: string }) =>
      req<VillaBlockedDate>(`${base}/${villaId}/blocked-dates`, { method: 'POST', body: JSON.stringify(data) }),

    removeBlockedDate: (villaId: string, blockId: string) =>
      req<{ ok: true }>(`${base}/${villaId}/blocked-dates/${blockId}`, { method: 'DELETE' }),
  };
}

export type VillaApi = ReturnType<typeof createVillaApi>;
