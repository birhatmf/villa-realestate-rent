/**
 * Blok tanımları — admin panelinin tek kaynağı.
 * Form alanları, "blok ekle" menüsü ve yeni blok varsayılanları buradan türer.
 * Yeni bir blok tipi eklemek: components/blocks/index.tsx'e component + buraya şema.
 */

export type Field =
  | { key: string; label: string; type: 'text' | 'textarea' | 'image'; placeholder?: string; hint?: string }
  | { key: string; label: string; type: 'number'; min?: number; max?: number; hint?: string }
  | { key: string; label: string; type: 'boolean'; hint?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'group'; fields: Field[] }
  | { key: string; label: string; type: 'list'; itemLabel: string; fields: Field[]; defaultItem: Record<string, any> };

export type BlockSchema = {
  label: string;
  description: string;
  /** Aynı sayfada birden fazla olamayacak bloklar (hero gibi). */
  unique?: boolean;
  fields: Field[];
  defaults: Record<string, any>;
};

const linkFields = (): Field[] => [
  { key: 'label', label: 'Buton yazısı', type: 'text' },
  { key: 'href', label: 'Bağlantı', type: 'text', placeholder: '/villalar' },
];

export const BLOCK_SCHEMAS: Record<string, BlockSchema> = {
  hero: {
    label: 'Hero',
    description: 'Tam ekran görsel slider + arama çubuğu',
    unique: true,
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'textarea', hint: 'Satır atlamak için Enter kullanın.' },
      { key: 'subtitle', label: 'Alt metin', type: 'textarea' },
      {
        key: 'slides',
        label: 'Görseller',
        type: 'list',
        itemLabel: 'Görsel',
        fields: [
          { key: 'image', label: 'Görsel URL', type: 'image' },
          { key: 'caption', label: 'Alt yazı', type: 'text', placeholder: 'Villa Adı · Bölge' },
        ],
        defaultItem: { image: '', caption: '' },
      },
      {
        key: 'search',
        label: 'Arama çubuğu',
        type: 'group',
        fields: [
          { key: 'placeholder', label: 'Arama ipucu metni', type: 'text' },
          { key: 'cta', label: 'Buton yazısı', type: 'text' },
        ],
      },
    ],
    defaults: {
      eyebrow: 'Üst başlık',
      title: 'Yeni başlık',
      subtitle: '',
      slides: [{ image: '', caption: '' }],
      search: { placeholder: 'Bölge veya villa adı', cta: 'Villa ara' },
    },
  },

  statBar: {
    label: 'Rakam şeridi',
    description: 'Yan yana sayı + etiket',
    fields: [
      {
        key: 'stats',
        label: 'Rakamlar',
        type: 'list',
        itemLabel: 'Rakam',
        fields: [
          { key: 'value', label: 'Değer', type: 'text', placeholder: '480+' },
          { key: 'label', label: 'Etiket', type: 'text' },
        ],
        defaultItem: { value: '', label: '' },
      },
    ],
    defaults: { stats: [{ value: '100+', label: 'Villa' }] },
  },

  regionGrid: {
    label: 'Bölgeler',
    description: 'Asimetrik bölge kartları (veri otomatik gelir)',
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'limit', label: 'Kaç bölge gösterilsin', type: 'number', min: 3, max: 12 },
    ],
    defaults: { eyebrow: 'Bölgeler', title: 'Nereye gitmek istersiniz?', limit: 8 },
  },

  conceptGrid: {
    label: 'Konseptler',
    description: 'Eşit ızgarada konsept koleksiyon kartları (veri otomatik gelir)',
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'limit', label: 'Kaç konsept gösterilsin', type: 'number', min: 2, max: 8 },
    ],
    defaults: { eyebrow: 'Konseptler', title: 'Size uygun konsepti keşfedin', limit: 4 },
  },

  featuredVillas: {
    label: 'Öne çıkan villalar',
    description: 'Villa kartları (veri otomatik gelir)',
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'description', label: 'Açıklama', type: 'textarea' },
      {
        key: 'limit',
        label: 'Kaç villa gösterilsin',
        type: 'number',
        min: 3,
        max: 12,
        hint: 'Villaları ve sıralarını Öne çıkanlar ekranından yönetin.',
      },
      { key: 'ctaLabel', label: 'Bağlantı yazısı', type: 'text' },
      { key: 'ctaHref', label: 'Bağlantı', type: 'text', placeholder: '/villalar' },
    ],
    defaults: {
      eyebrow: 'Seçkiler',
      title: 'Öne çıkanlar',
      description: '',
      limit: 8,
      ctaLabel: 'Tüm villaları gör',
      ctaHref: '/villalar',
    },
  },

  editorialSplit: {
    label: 'Görsel + metin',
    description: 'Solda büyük görsel, sağda anlatı',
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'body', label: 'Metin', type: 'textarea' },
      { key: 'image', label: 'Görsel URL', type: 'image' },
      { key: 'ctaLabel', label: 'Bağlantı yazısı', type: 'text' },
      { key: 'ctaHref', label: 'Bağlantı', type: 'text' },
    ],
    defaults: { eyebrow: '', title: 'Başlık', body: '', image: '', ctaLabel: '', ctaHref: '' },
  },

  valueProps: {
    label: 'Avantajlar',
    description: 'Zeytin zemin üzerinde ikonlu maddeler',
    fields: [
      { key: 'title', label: 'Başlık', type: 'text' },
      {
        key: 'items',
        label: 'Maddeler',
        type: 'list',
        itemLabel: 'Madde',
        fields: [
          {
            key: 'icon',
            label: 'İkon',
            type: 'select',
            options: [
              { value: 'shield', label: 'Kalkan' },
              { value: 'key', label: 'Anahtar' },
              { value: 'clock', label: 'Saat' },
              { value: 'sparkle', label: 'Parıltı' },
            ],
          },
          { key: 'title', label: 'Başlık', type: 'text' },
          { key: 'text', label: 'Metin', type: 'textarea' },
        ],
        defaultItem: { icon: 'sparkle', title: '', text: '' },
      },
    ],
    defaults: { title: 'Başlık', items: [{ icon: 'sparkle', title: '', text: '' }] },
  },

  testimonials: {
    label: 'Misafir yorumları',
    description: 'Üç sütunlu alıntılar',
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'text' },
      {
        key: 'items',
        label: 'Yorumlar',
        type: 'list',
        itemLabel: 'Yorum',
        fields: [
          { key: 'quote', label: 'Yorum', type: 'textarea' },
          { key: 'author', label: 'Kişi', type: 'text' },
          { key: 'meta', label: 'Villa / tarih', type: 'text' },
        ],
        defaultItem: { quote: '', author: '', meta: '' },
      },
    ],
    defaults: {
      eyebrow: 'Misafirler',
      title: 'Dönüşte yazdıkları',
      items: [{ quote: '', author: '', meta: '' }],
    },
  },

  ctaBanner: {
    label: 'CTA bandı',
    description: 'Görsel üzerine koyu çağrı alanı',
    fields: [
      { key: 'eyebrow', label: 'Üst başlık', type: 'text' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'text', label: 'Metin', type: 'textarea' },
      { key: 'image', label: 'Arka plan görseli', type: 'image' },
      { key: 'primary', label: 'Birincil buton', type: 'group', fields: linkFields() },
      { key: 'secondary', label: 'İkincil buton', type: 'group', fields: linkFields() },
    ],
    defaults: {
      eyebrow: '',
      title: 'Başlık',
      text: '',
      image: '',
      primary: { label: 'Buton', href: '/' },
      secondary: { label: '', href: '' },
    },
  },

  textContent: {
    label: 'Metin içeriği',
    description: 'Kurumsal, SSS ve yasal sayfalar için okunaklı metin alanı',
    fields: [
      {
        key: 'intro',
        label: 'Giriş metni',
        type: 'textarea',
        hint: 'Sayfa başlığının altında öne çıkan kısa açıklama.',
      },
      {
        key: 'items',
        label: 'Bölümler',
        type: 'list',
        itemLabel: 'Bölüm',
        fields: [
          { key: 'title', label: 'Bölüm başlığı', type: 'text' },
          {
            key: 'body',
            label: 'Metin',
            type: 'textarea',
            hint: 'Paragrafları ayırmak için boş satır kullanın.',
          },
        ],
        defaultItem: { title: '', body: '' },
      },
    ],
    defaults: { intro: '', items: [{ title: '', body: '' }] },
  },
};

/** Preview için sunucudan veri çekmesi gereken bloklar. */
export const DYNAMIC_TYPES = new Set(['regionGrid', 'conceptGrid', 'featuredVillas']);

export const blockLabel = (type: string) => BLOCK_SCHEMAS[type]?.label ?? type;
