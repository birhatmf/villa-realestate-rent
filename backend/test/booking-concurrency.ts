import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from '../src/bookings/bookings.service';
import { CalendarService } from '../src/bookings/calendar.service';
import { OccupancyService } from '../src/bookings/occupancy.service';
import { PrismaService } from '../src/prisma.service';
import { VillasService } from '../src/villas/villas.service';

if (process.env.ALLOW_BOOKING_TEST !== '1') {
  throw new Error('Bu test yalnızca geçici veritabanında ALLOW_BOOKING_TEST=1 ile çalıştırılabilir.');
}

const prisma = new PrismaService();
const occupancy = new OccupancyService(prisma);
const bookings = new BookingsService(prisma, occupancy);
const calendar = new CalendarService(prisma);
const villas = new VillasService(prisma, occupancy);
const ownerPrefix = `booking-test-${Date.now()}`;
let guestId: string | undefined;

async function main() {
  await prisma.$connect();
  const villa = await prisma.villa.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true } });
  assert.ok(villa, 'Seed edilmiş yayınlanmış villa bulunmalı.');
  const guest = await prisma.user.create({
    data: {
      email: `${ownerPrefix}@example.test`,
      name: 'Concurrency Test',
      passwordHash: 'test-only',
      role: 'GUEST',
    },
  });
  guestId = guest.id;

  const sameDates = Array.from({ length: 50 }, (_, index) =>
    bookings.createHold(
      { villaId: villa.id, from: '2035-09-10', to: '2035-09-15', adults: 2 },
      guest.id,
      `${ownerPrefix}-race-${index}`,
    ),
  );
  const raceResults = await Promise.allSettled(sameDates);
  const winners = raceResults.filter((result) => result.status === 'fulfilled');
  const rejected = raceResults.filter((result) => result.status === 'rejected');
  assert.equal(winners.length, 1, 'Aynı tarihlerde yalnızca bir bekletme kazanmalı.');
  assert.equal(rejected.length, 49);
  assert.ok(rejected.every((result) => result.reason instanceof ConflictException));
  await prisma.booking.deleteMany({ where: { guestId: guest.id } });

  const idempotencyKey = `${ownerPrefix}-same-request`;
  const repeated = await Promise.all(
    Array.from({ length: 20 }, () =>
      bookings.createHold(
        { villaId: villa.id, from: '2035-10-01', to: '2035-10-05', adults: 2 },
        guest.id,
        idempotencyKey,
      ),
    ),
  );
  assert.equal(new Set(repeated.map((booking) => booking.id)).size, 1, 'Tekrarlı istek tek kayıt döndürmeli.');
  await prisma.booking.deleteMany({ where: { guestId: guest.id } });

  const first = await bookings.createHold(
    { villaId: villa.id, from: '2035-11-10', to: '2035-11-15', adults: 2 },
    guest.id,
    `${ownerPrefix}-adjacent-a`,
  );
  await bookings.createHold(
    { villaId: villa.id, from: '2035-11-15', to: '2035-11-20', adults: 2 },
    guest.id,
    `${ownerPrefix}-adjacent-b`,
  );

  await assert.rejects(
    prisma.booking.create({
      data: {
        villaId: villa.id,
        guestId: guest.id,
        status: 'CONFIRMED',
        channel: 'ADMIN',
        checkIn: new Date('2035-11-14T00:00:00.000Z'),
        checkOut: new Date('2035-11-18T00:00:00.000Z'),
        adults: 2,
        currency: first.currency,
        accommodationAmount: 1,
        cleaningFeeAmount: 0,
        depositAmount: 0,
        totalAmount: 1,
        priceSnapshot: {},
        confirmedAt: new Date(),
        idempotencyOwner: ownerPrefix,
        idempotencyKey: 'database-constraint',
        requestHash: 'database-constraint',
      },
    }),
    (error: unknown) =>
      (error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError) &&
      error.message.includes('Booking_no_active_overlap'),
    'Veritabanı kısıtı servis dışından gelen çakışmayı da reddetmeli.',
  );
  await prisma.booking.deleteMany({ where: { guestId: guest.id } });

  const bookingVsBlock = await Promise.allSettled([
    bookings.createHold(
      { villaId: villa.id, from: '2035-12-01', to: '2035-12-05', adults: 2 },
      guest.id,
      `${ownerPrefix}-booking-vs-block`,
    ),
    villas.addBlockedDate(villa.id, {
      startDate: '2035-12-01',
      endDate: '2035-12-05',
      note: ownerPrefix,
    }),
  ]);
  assert.equal(bookingVsBlock.filter((result) => result.status === 'fulfilled').length, 1);
  assert.ok(
    bookingVsBlock
      .filter((result) => result.status === 'rejected')
      .every((result) => result.reason instanceof ConflictException),
    'Rezervasyon ile manuel blok yarışında yalnızca biri kazanmalı.',
  );
  await prisma.booking.deleteMany({ where: { guestId: guest.id } });
  await prisma.villaBlockedDate.deleteMany({ where: { note: ownerPrefix } });

  for (let index = 0; index < 5; index += 1) {
    const day = String(1 + index * 5).padStart(2, '0');
    const nextDay = String(5 + index * 5).padStart(2, '0');
    await bookings.createHold(
      { villaId: villa.id, from: `2036-02-${day}`, to: `2036-02-${nextDay}`, adults: 2 },
      guest.id,
      `${ownerPrefix}-limit-${index}`,
    );
  }
  await assert.rejects(
    bookings.createHold(
      { villaId: villa.id, from: '2036-03-01', to: '2036-03-05', adults: 2 },
      guest.id,
      `${ownerPrefix}-over-limit`,
    ),
    (error: unknown) => error instanceof ConflictException,
  );
  await prisma.booking.deleteMany({ where: { guestId: guest.id } });

  const expired = await prisma.booking.create({
    data: {
      villaId: villa.id,
      guestId: guest.id,
      status: 'HOLD',
      channel: 'WEBSITE',
      checkIn: new Date('2036-01-10T00:00:00.000Z'),
      checkOut: new Date('2036-01-15T00:00:00.000Z'),
      adults: 2,
      currency: first.currency,
      accommodationAmount: 1,
      cleaningFeeAmount: 0,
      depositAmount: 0,
      totalAmount: 1,
      priceSnapshot: {},
      holdExpiresAt: new Date(Date.now() - 60_000),
      idempotencyOwner: ownerPrefix,
      idempotencyKey: 'expired-hold',
      requestHash: 'expired-hold',
    },
  });
  await bookings.createHold(
    { villaId: villa.id, from: '2036-01-10', to: '2036-01-15', adults: 2 },
    guest.id,
    `${ownerPrefix}-after-expiry`,
  );
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: expired.id } })).status, 'EXPIRED');
  await prisma.booking.deleteMany({ where: { guestId: guest.id } });

  const managed = await bookings.createConfirmed(
    {
      villaId: villa.id,
      from: '2036-04-10',
      to: '2036-04-15',
      adults: 2,
      customerName: 'Takvim Testi',
      customerEmail: 'calendar@example.test',
    },
    guest.id,
    `${ownerPrefix}-managed`,
  );
  const concurrentChanges = await Promise.allSettled([
    bookings.change(managed.id, { from: '2036-04-11', to: '2036-04-16', adults: 2, version: 0 }, guest.id),
    bookings.change(managed.id, { from: '2036-04-12', to: '2036-04-17', adults: 2, version: 0 }, guest.id),
  ]);
  assert.equal(concurrentChanges.filter((result) => result.status === 'fulfilled').length, 1);
  assert.ok(concurrentChanges.filter((result) => result.status === 'rejected').every((result) => result.reason instanceof ConflictException));

  const calendarRange = await calendar.range({ from: '2036-04-01', to: '2036-05-01', villaId: villa.id });
  assert.equal(calendarRange.events.filter((event) => event.source === 'BOOKING').length, 1);
  const block = await villas.addBlockedDate(
    villa.id,
    { startDate: '2036-05-01', endDate: '2036-05-05', kind: 'MAINTENANCE', note: ownerPrefix },
    undefined,
    guest.id,
  );
  const secondBlock = await villas.addBlockedDate(
    villa.id,
    { startDate: '2036-05-03', endDate: '2036-05-07', kind: 'OWNER_USE', note: ownerPrefix },
    undefined,
    guest.id,
  );
  const overlappingReasons = await calendar.range({ from: '2036-05-01', to: '2036-05-10', villaId: villa.id });
  assert.equal(overlappingReasons.events.filter((event) => event.source === 'BLOCK').length, 2);
  await assert.rejects(
    villas.removeBlockedDate(villa.id, block.id, block.version + 1, undefined, guest.id),
    (error: unknown) => error instanceof ConflictException,
  );
  await villas.removeBlockedDate(villa.id, block.id, block.version, undefined, guest.id);
  const remainingReason = await calendar.range({ from: '2036-05-01', to: '2036-05-10', villaId: villa.id });
  assert.equal(remainingReason.events.filter((event) => event.source === 'BLOCK').length, 1);
  await villas.removeBlockedDate(villa.id, secondBlock.id, secondBlock.version, undefined, guest.id);
  const history = await calendar.audit(villa.id, 20);
  assert.ok(history.some((entry) => entry.action === 'BOOKING_CREATED'));
  assert.ok(history.some((entry) => entry.action === 'BOOKING_CHANGED'));
  assert.ok(history.some((entry) => entry.action === 'BLOCK_CREATED'));
  assert.ok(history.some((entry) => entry.action === 'BLOCK_RELEASED'));

  console.log('booking-concurrency: yarış, sürüm, audit, takvim, blok, limit, süre aşımı ve DB kısıtı geçti');
}

main()
  .finally(async () => {
    if (guestId) await prisma.booking.deleteMany({ where: { guestId } });
    await prisma.villaBlockedDate.deleteMany({ where: { note: ownerPrefix } });
    await prisma.user.deleteMany({ where: { email: { startsWith: ownerPrefix } } });
    await prisma.$disconnect();
  });
