'use client';

import { req } from './http';

export type BookingStatus = 'HOLD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
export type BlockKind = 'MANUAL' | 'MAINTENANCE' | 'OWNER_USE';

export type CalendarEvent = {
  id: string;
  villaId: string;
  source: 'BOOKING' | 'BLOCK';
  kind: BookingStatus | BlockKind;
  startDate: string;
  endDate: string;
  title: string;
  version: number;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  holdExpiresAt?: string | null;
  totalAmount?: number;
  currency?: string;
};

export type CalendarData = {
  from: string;
  to: string;
  villas: {
    id: string;
    title: string;
    status: string;
    region: { id: string; name: string };
  }[];
  events: CalendarEvent[];
};

export type CalendarAudit = {
  id: string;
  villaId: string;
  entityType: string;
  entityId: string;
  action: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  villa: { title: string };
  actor: { name: string; role: string } | null;
};

export type Booking = {
  id: string;
  villaId: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  totalAmount: number;
  currency: string;
  version: number;
};

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => value !== undefined && value !== '' && params.set(key, String(value)));
  return params.toString();
};

export const bookingApi = {
  calendar: (from: string, to: string) =>
    req<CalendarData>(`/admin/calendar?${query({ from, to })}`),
  audit: (villaId?: string) =>
    req<CalendarAudit[]>(`/admin/calendar/audit?${query({ villaId, limit: 30 })}`),
  list: (status?: string) =>
    req<{ items: Booking[]; total: number }>(`/admin/bookings?${query({ status, pageSize: 100 })}`),
  create: (data: {
    villaId: string;
    from: string;
    to: string;
    adults: number;
    children: number;
    infants: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
  }) => req<Booking>('/admin/bookings', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(data),
  }),
  change: (id: string, data: { from: string; to: string; adults: number; children: number; infants: number; version: number }) =>
    req<Booking>(`/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  confirm: (id: string, version: number) =>
    req<Booking>(`/admin/bookings/${id}/confirm`, { method: 'POST', body: JSON.stringify({ version }) }),
  cancel: (id: string, version: number, note: string) =>
    req<Booking>(`/admin/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ version, note }) }),
  addBlock: (villaId: string, data: { startDate: string; endDate: string; kind: BlockKind; note?: string }) =>
    req<CalendarEvent>(`/admin/villas/${villaId}/blocked-dates`, { method: 'POST', body: JSON.stringify(data) }),
  removeBlock: (villaId: string, id: string, version: number) =>
    req<{ ok: true }>(`/admin/villas/${villaId}/blocked-dates/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ version }),
    }),
};
