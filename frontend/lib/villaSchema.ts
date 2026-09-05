/** Villa formu enum etiket haritaları — form ve tablo görünümü tek kaynaktan besleniyor. */

export const BUILDING_TYPES = [
  { value: 'DETACHED', label: 'Müstakil villa' },
  { value: 'SEMI_DETACHED', label: 'İkiz villa' },
  { value: 'SITE', label: 'Site içi villa' },
  { value: 'STONE_HOUSE', label: 'Taş ev' },
  { value: 'BUNGALOW', label: 'Bungalov' },
] as const;

export const POOL_TYPES = [
  { value: 'NONE', label: 'Havuz yok' },
  { value: 'PRIVATE', label: 'Özel havuz' },
  { value: 'SHARED', label: 'Ortak havuz' },
  { value: 'INFINITY', label: 'Sonsuzluk (infinity) havuzu' },
] as const;

export const PET_POLICIES = [
  { value: 'NOT_ALLOWED', label: 'İzin verilmiyor' },
  { value: 'ALLOWED_FREE', label: 'İzin veriliyor (ücretsiz)' },
  { value: 'ALLOWED_FEE', label: 'İzin veriliyor (ek ücretli)' },
] as const;

export const BED_TYPES = [
  { value: 'DOUBLE', label: 'Çift kişilik yatak' },
  { value: 'TWIN', label: '2 tek kişilik yatak' },
  { value: 'SINGLE', label: 'Tek kişilik yatak' },
  { value: 'BUNK', label: 'Ranza' },
  { value: 'SOFA_BED', label: 'Çekyat' },
] as const;

export const IMAGE_CATEGORIES = [
  { value: 'LIVING_KITCHEN', label: 'Salon / Mutfak' },
  { value: 'POOL_GARDEN', label: 'Havuz & Bahçe / Teras' },
  { value: 'BEDROOM', label: 'Yatak Odaları' },
  { value: 'EXTERIOR_VIEW', label: 'Dış Cephe ve Manzara' },
  { value: 'OTHER', label: 'Diğer' },
] as const;

export const CURRENCIES = ['TRY', 'EUR', 'GBP', 'USD'] as const;

export const VIEW_TAGS = [
  { value: 'sea', label: 'Deniz manzaralı' },
  { value: 'nature', label: 'Doğa manzaralı' },
] as const;

/** Konsept/donanım etiketleri — Villa.amenities serbest metin dizisi, öneri listesi. */
export const AMENITY_SUGGESTIONS = [
  'Jakuzi',
  'Sauna',
  'Türk hamamı',
  'Şömine',
  'Spor odası',
  'Jeneratör',
  'Su deposu',
  'Elektrikli araç şarj istasyonu',
  'Çalışma masası',
  'Barbekü',
  'Otopark',
];

export const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const toMap = <T extends { value: string; label: string }>(arr: readonly T[]) =>
  Object.fromEntries(arr.map((o) => [o.value, o.label])) as Record<string, string>;

export const BUILDING_TYPE_LABEL = toMap(BUILDING_TYPES);
export const POOL_TYPE_LABEL = toMap(POOL_TYPES);
export const PET_POLICY_LABEL = toMap(PET_POLICIES);
export const BED_TYPE_LABEL = toMap(BED_TYPES);
export const IMAGE_CATEGORY_LABEL = toMap(IMAGE_CATEGORIES);

export const VILLA_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Taslak',
  PENDING_REVIEW: 'İncelemede',
  PUBLISHED: 'Yayında',
  REJECTED: 'Reddedildi',
};
export const VILLA_STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-sand-deep/70 text-muted',
  PENDING_REVIEW: 'bg-gold/15 text-gold',
  PUBLISHED: 'bg-olive/15 text-olive',
  REJECTED: 'bg-red-100 text-red-700',
};

export const MIN_PUBLISH_IMAGES = 15;
export const MIN_IMAGE_WIDTH = 1920;
export const MIN_IMAGE_HEIGHT = 1080;
