import type { DocumentType, OwnershipType } from './hostApplicationApi';

export type DocSlot = {
  type: DocumentType;
  label: string;
  hint?: string;
  /** undefined → her zaman zorunlu. Fonksiyon → mülkiyet tipine göre zorunlu. */
  requiredWhen?: (ownership: OwnershipType) => boolean;
};

/** Checklist tek kaynağı — form ve doğrulama buradan türer. */
export const DOCUMENT_SLOTS: DocSlot[] = [
  {
    type: 'PERMIT_CERTIFICATE',
    label: 'Kültür ve Turizm Bakanlığı Turizm Amaçlı Konut İzin Belgesi',
    hint: 'PDF veya net okunabilir görsel.',
  },
  {
    type: 'PLAQUE_PHOTO',
    label: 'Kapıdaki Bakanlık Plaketi Fotoğrafı',
    hint: 'Karekod net okunmalıdır.',
  },
  { type: 'TITLE_DEED', label: 'Tapu Kaydı / Fotokopisi' },
  {
    type: 'ID_DOCUMENT',
    label: 'T.C. Kimlik Kartı Fotokopisi',
    hint: 'Tüzel kişi ise İmza Sirküleri + Vergi Levhası.',
  },
  {
    type: 'FIRE_SAFETY_DECLARATION',
    label: 'Yangın / Güvenlik Ekipmanları Beyanı',
    hint: 'Yangın tüpü, duman dedektörü, tahliye şeması.',
  },
  {
    type: 'CONSENT_LETTER',
    label: 'Hissedar Muvafakatnamesi',
    hint: 'Yalnızca hisseli tapuda gereklidir.',
    requiredWhen: (o) => o === 'SHARED',
  },
  {
    type: 'MANAGEMENT_DECISION',
    label: 'Site / Rezidans Yönetim Kararı',
    hint: 'Yalnızca site/rezidans içindeki mülklerde gereklidir.',
    requiredWhen: (o) => o === 'SITE',
  },
  {
    type: 'POWER_OF_ATTORNEY',
    label: 'Yetki / Temsil Belgesi (Noter Onaylı Vekaletname)',
    hint: 'Yalnızca işlemi bir vekil yürütüyorsa gereklidir. Opsiyonel.',
    requiredWhen: () => false,
  },
];

export const isRequired = (slot: DocSlot, ownership: OwnershipType) =>
  slot.requiredWhen ? slot.requiredWhen(ownership) : true;

export const DOC_TYPE_LABEL: Record<DocumentType, string> = Object.fromEntries(
  DOCUMENT_SLOTS.map((s) => [s.type, s.label]),
) as Record<DocumentType, string>;
