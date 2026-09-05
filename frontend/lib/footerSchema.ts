import type { Field } from './blockSchema';

export const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'pinterest', label: 'Pinterest' },
];

const linkListFields: Field[] = [
  { key: 'label', label: 'Yazı', type: 'text' },
  { key: 'href', label: 'Bağlantı', type: 'text', placeholder: '/villalar' },
];

/** Footer & iletişim ayarları — Setting tablosunda key: "footer". */
export const FOOTER_FIELDS: Field[] = [
  {
    key: 'brand',
    label: 'Marka',
    type: 'group',
    fields: [{ key: 'description', label: 'Kısa açıklama', type: 'textarea' }],
  },
  {
    key: 'newsletter',
    label: 'Bülten şeridi',
    type: 'group',
    fields: [
      { key: 'enabled', label: 'Bülten şeridi görünsün', type: 'boolean' },
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'text', label: 'Açıklama', type: 'textarea' },
      { key: 'placeholder', label: 'Alan ipucu', type: 'text' },
      { key: 'cta', label: 'Buton yazısı', type: 'text' },
    ],
  },
  {
    key: 'columns',
    label: 'Bağlantı sütunları',
    type: 'list',
    itemLabel: 'Sütun',
    fields: [
      { key: 'title', label: 'Sütun başlığı', type: 'text' },
      {
        key: 'links',
        label: 'Bağlantılar',
        type: 'list',
        itemLabel: 'Bağlantı',
        fields: linkListFields,
        defaultItem: { label: '', href: '' },
      },
    ],
    defaultItem: { title: 'Yeni sütun', links: [{ label: '', href: '' }] },
  },
  {
    key: 'contact',
    label: 'İletişim & konum',
    type: 'group',
    fields: [
      { key: 'title', label: 'Başlık', type: 'text' },
      { key: 'address', label: 'Adres', type: 'textarea' },
      { key: 'phone', label: 'Telefon', type: 'text', placeholder: '0212 000 00 00' },
      { key: 'email', label: 'E‑posta', type: 'text' },
      {
        key: 'mapUrl',
        label: 'Harita bağlantısı',
        type: 'text',
        placeholder: 'https://maps.google.com/?q=…',
        hint: 'Google Maps’te konumu açıp adres çubuğundaki bağlantıyı yapıştırın.',
      },
      { key: 'mapLabel', label: 'Harita bağlantı yazısı', type: 'text' },
    ],
  },
  {
    key: 'social',
    label: 'Sosyal medya',
    type: 'list',
    itemLabel: 'Hesap',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: SOCIAL_PLATFORMS },
      { key: 'url', label: 'Profil adresi', type: 'text', placeholder: 'https://instagram.com/…' },
    ],
    defaultItem: { platform: 'instagram', url: '' },
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp butonu',
    type: 'group',
    fields: [
      { key: 'enabled', label: 'Yüzen WhatsApp butonu görünsün', type: 'boolean' },
      {
        key: 'phone',
        label: 'Numara',
        type: 'text',
        placeholder: '905000000000',
        hint: 'Ülke kodu ile, boşluksuz ve + işaretsiz.',
      },
      { key: 'message', label: 'Hazır mesaj', type: 'textarea' },
      { key: 'label', label: 'Butonun yanındaki yazı', type: 'text' },
      {
        key: 'position',
        label: 'Konum',
        type: 'select',
        options: [
          { value: 'right', label: 'Sağ alt' },
          { value: 'left', label: 'Sol alt' },
        ],
      },
    ],
  },
  {
    key: 'legal',
    label: 'Yasal bağlantılar',
    type: 'list',
    itemLabel: 'Bağlantı',
    fields: linkListFields,
    defaultItem: { label: '', href: '' },
  },
  {
    key: 'copyright',
    label: 'Telif satırı',
    type: 'text',
    hint: '{year} yazarsanız içinde bulunulan yıl otomatik yazılır.',
  },
];

export const FOOTER_DEFAULTS = {
  brand: { description: '' },
  newsletter: { enabled: true, title: '', text: '', placeholder: 'E‑posta adresiniz', cta: 'Kaydol' },
  columns: [],
  contact: { title: 'İletişim', address: '', phone: '', email: '', mapUrl: '', mapLabel: '' },
  social: [],
  whatsapp: { enabled: false, phone: '', message: '', label: '', position: 'right' },
  legal: [],
  copyright: '© {year} Villa Sepeti.',
};
