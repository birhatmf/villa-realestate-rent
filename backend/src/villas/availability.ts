import { BadRequestException } from '@nestjs/common';

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export type StayDates = {
  checkIn: Date;
  checkOut: Date;
  nights: number;
};

export type AvailabilityReason =
  | 'SALES_PAUSED'
  | 'DATES_UNAVAILABLE'
  | 'MIN_STAY'
  | 'CHECKIN_DAY'
  | 'CAPACITY_EXCEEDED';

export type AvailabilityVilla = {
  salesStatus: 'OPEN' | 'PAUSED';
  minNights: number;
  checkInWeekday: number | null;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  priceRules: { startDate: Date; endDate: Date; minNights: number | null }[];
  blockedDates: { startDate: Date; endDate: Date }[];
};

/** Takvim günleri her yerde YYYY-MM-DD ve UTC gece yarısı olarak temsil edilir. */
export function parseCalendarDate(value: string): Date {
  if (!CALENDAR_DATE_RE.test(value)) throw new BadRequestException('Tarih YYYY-AA-GG biçiminde olmalı.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('Geçerli bir takvim tarihi seçin.');
  }
  return date;
}

export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseStayDates(from: string, to: string): StayDates {
  const checkIn = parseCalendarDate(from);
  const checkOut = parseCalendarDate(to);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
  if (nights < 1) throw new BadRequestException('Çıkış tarihi giriş tarihinden sonra olmalı.');
  return { checkIn, checkOut, nights };
}

export function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export function minimumNightsFor(villa: AvailabilityVilla, checkIn: Date): number {
  const seasonalMinimums = villa.priceRules
    .filter((rule) => rule.minNights !== null && rule.startDate <= checkIn && rule.endDate > checkIn)
    .map((rule) => rule.minNights as number);
  return seasonalMinimums.length ? Math.max(...seasonalMinimums) : villa.minNights;
}

export function evaluateAvailability(
  villa: AvailabilityVilla,
  dates: StayDates,
  guests: { adults: number; children: number; infants: number },
) {
  const minimumNights = minimumNightsFor(villa, dates.checkIn);
  const reasons: AvailabilityReason[] = [];
  if (villa.salesStatus !== 'OPEN') reasons.push('SALES_PAUSED');
  if (dates.nights < minimumNights) reasons.push('MIN_STAY');
  if (villa.checkInWeekday !== null && dates.checkIn.getUTCDay() !== villa.checkInWeekday) {
    reasons.push('CHECKIN_DAY');
  }
  if (
    guests.adults > villa.maxAdults ||
    guests.children > villa.maxChildren ||
    guests.infants > villa.maxInfants
  ) {
    reasons.push('CAPACITY_EXCEEDED');
  }
  if (villa.blockedDates.some((block) => rangesOverlap(dates.checkIn, dates.checkOut, block.startDate, block.endDate))) {
    reasons.push('DATES_UNAVAILABLE');
  }
  return { available: reasons.length === 0, nights: dates.nights, minimumNights, reasons };
}
