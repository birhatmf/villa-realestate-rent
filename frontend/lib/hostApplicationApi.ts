'use client';

import { req } from './http';

export type OwnershipType = 'SOLE' | 'SHARED' | 'SITE';
export type DocumentType =
  | 'PERMIT_CERTIFICATE'
  | 'PLAQUE_PHOTO'
  | 'TITLE_DEED'
  | 'ID_DOCUMENT'
  | 'FIRE_SAFETY_DECLARATION'
  | 'POWER_OF_ATTORNEY'
  | 'CONSENT_LETTER'
  | 'MANAGEMENT_DECISION'
  | 'OTHER';

export type CreateApplicationInput = {
  ownerName: string;
  ownerIdNumber: string;
  phone: string;
  email: string;
  uetsAddress?: string;
  iban: string;
  address: string;
  parcelNo?: string;
  permitNumber?: string;
  maxCapacity?: number;
  kbsCode?: string;
  ownershipType: OwnershipType;
  signatureName: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const createHostApplication = (input: CreateApplicationInput) =>
  req<{ id: string }>('/host-applications', { method: 'POST', body: JSON.stringify(input) });

/** multipart — req() sarmalayıcısı Content-Type'ı zorluyor, o yüzden burada doğrudan fetch. */
export async function uploadHostApplicationDocument(
  applicationId: string,
  type: DocumentType,
  file: File,
) {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const res = await fetch(`${API}/host-applications/${applicationId}/documents`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(msg ?? `Dosya yüklenemedi (${res.status})`);
  }
  return res.json();
}
