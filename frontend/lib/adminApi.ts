'use client';

import { req } from './http';

export { ApiError } from './http';

export type AdminSection = {
  id: string;
  type: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
  preview: Record<string, any>;
};

export type AdminPage = {
  id: string;
  slug: string;
  title: string;
  sections: AdminSection[];
};

export const listPages = () =>
  req<{ id: string; slug: string; title: string; updatedAt: string; _count: { sections: number } }[]>(
    '/admin/pages',
  );

export const getAdminPage = (slug: string) => req<AdminPage>(`/admin/pages/${slug}`);

export const previewBlock = (type: string, content: Record<string, any>) =>
  req<Record<string, any>>('/admin/preview', {
    method: 'POST',
    body: JSON.stringify({ type, content }),
  });

export const updateSection = (id: string, data: { content?: Record<string, any>; visible?: boolean }) =>
  req<AdminSection>(`/admin/sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const addSection = (pageId: string, type: string, content: Record<string, any>, index?: number) =>
  req<AdminSection>(`/admin/pages/${pageId}/sections`, {
    method: 'POST',
    body: JSON.stringify({ type, content, index }),
  });

export const removeSection = (id: string) =>
  req<{ ok: true }>(`/admin/sections/${id}`, { method: 'DELETE' });

export const getSetting = (key: string) => req<Record<string, any>>(`/admin/settings/${key}`);

export const saveSetting = (key: string, value: Record<string, any>) =>
  req<Record<string, any>>(`/admin/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });

export const reorderSections = (pageId: string, ids: string[]) =>
  req<{ ok: true }>(`/admin/pages/${pageId}/sections/order`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'GUEST' | 'HOST' | 'ADMIN';
  active: boolean;
  marketingOptIn: boolean;
  kvkkAcceptedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserListResult = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export const listUsers = (params: {
  q?: string;
  role?: string;
  active?: string;
  page?: number;
  pageSize?: number;
}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  return req<UserListResult>(`/admin/users?${qs}`);
};

export const updateUser = (id: string, data: { role?: string; active?: boolean }) =>
  req<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteUser = (id: string) =>
  req<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE' });

export type HostApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type HostApplicationDocument = {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type HostApplicationListItem = {
  id: string;
  status: HostApplicationStatus;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  ownershipType: 'SOLE' | 'SHARED' | 'SITE';
  createdAt: string;
  _count: { documents: number };
};

export type HostApplicationDetail = Omit<HostApplicationListItem, '_count'> & {
  ownerIdNumber: string;
  uetsAddress: string | null;
  iban: string;
  parcelNo: string | null;
  permitNumber: string | null;
  maxCapacity: number | null;
  kbsCode: string | null;
  termsAcceptedAt: string;
  signatureName: string;
  adminNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  documents: HostApplicationDocument[];
};

export type HostApplicationListResult = {
  items: HostApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export const listHostApplications = (params: {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  return req<HostApplicationListResult>(`/admin/host-applications?${qs}`);
};

export const getHostApplication = (id: string) =>
  req<HostApplicationDetail>(`/admin/host-applications/${id}`);

export const reviewHostApplication = (
  id: string,
  data: { status: 'APPROVED' | 'REJECTED'; adminNote?: string },
) =>
  req<HostApplicationDetail>(`/admin/host-applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const hostApplicationDownloadUrl = (appId: string, docId: string) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/admin/host-applications/${appId}/documents/${docId}/download`;

export const listRegions = () =>
  req<{ id: string; slug: string; name: string }[]>('/regions');

// ---- Bölgeler & Konseptler --------------------------------------------------

export type TaxonomyItem = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description?: string | null;
  image: string;
  order: number;
  _count: { villas: number };
};

export type TaxonomyInput = { name: string; subtitle?: string; description?: string; image: string };

function createTaxonomyApi(kind: 'regions' | 'concepts') {
  const base = `/admin/${kind}`;
  return {
    list: () => req<TaxonomyItem[]>(base),
    create: (data: TaxonomyInput) => req<TaxonomyItem>(base, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<TaxonomyInput>) =>
      req<TaxonomyItem>(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => req<{ ok: true }>(`${base}/${id}`, { method: 'DELETE' }),
    reorder: (ids: string[]) => req<{ ok: true }>(`${base}/order`, { method: 'PUT', body: JSON.stringify({ ids }) }),
  };
}

export const regionsApi = createTaxonomyApi('regions');
export const conceptsApi = createTaxonomyApi('concepts');

export const listConcepts = () => req<{ id: string; slug: string; name: string }[]>('/concepts');
