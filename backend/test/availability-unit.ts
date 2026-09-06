import assert from 'node:assert/strict';
import { evaluateAvailability, parseCalendarDate, parseStayDates } from '../src/villas/availability';

const date = parseCalendarDate;
const baseVilla = {
  salesStatus: 'OPEN' as const,
  minNights: 2,
  checkInWeekday: null,
  maxAdults: 4,
  maxChildren: 2,
  maxInfants: 1,
  priceRules: [] as { startDate: Date; endDate: Date; minNights: number | null }[],
  blockedDates: [] as { startDate: Date; endDate: Date }[],
};

assert.equal(parseStayDates('2026-09-10', '2026-09-15').nights, 5);
assert.throws(() => parseCalendarDate('2026-02-30'));

const adjoining = {
  ...baseVilla,
  blockedDates: [{ startDate: date('2026-09-10'), endDate: date('2026-09-15') }],
};
assert.equal(
  evaluateAvailability(adjoining, parseStayDates('2026-09-15', '2026-09-17'), { adults: 2, children: 0, infants: 0 }).available,
  true,
);
assert.deepEqual(
  evaluateAvailability(adjoining, parseStayDates('2026-09-14', '2026-09-17'), { adults: 2, children: 0, infants: 0 }).reasons,
  ['DATES_UNAVAILABLE'],
);

const seasonal = {
  ...baseVilla,
  priceRules: [{ startDate: date('2026-09-01'), endDate: date('2026-10-01'), minNights: 4 }],
};
assert.deepEqual(
  evaluateAvailability(seasonal, parseStayDates('2026-09-10', '2026-09-13'), { adults: 2, children: 0, infants: 0 }).reasons,
  ['MIN_STAY'],
);
assert.deepEqual(
  evaluateAvailability(baseVilla, parseStayDates('2026-09-10', '2026-09-12'), { adults: 5, children: 0, infants: 0 }).reasons,
  ['CAPACITY_EXCEEDED'],
);

console.log('availability-unit: ok');
