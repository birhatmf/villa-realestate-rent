import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { evaluateAvailability, type StayDates } from '../villas/availability';

export type GuestCounts = { adults: number; children: number; infants: number };

const VILLA_SELECT = {
  id: true,
  status: true,
  salesStatus: true,
  minNights: true,
  checkInWeekday: true,
  maxAdults: true,
  maxChildren: true,
  maxInfants: true,
  pricePerNight: true,
  currency: true,
  cleaningFee: true,
  cleaningFeeThresholdNights: true,
  depositAmount: true,
  priceRules: {
    orderBy: { startDate: 'asc' as const },
    select: { startDate: true, endDate: true, pricePerNight: true, minNights: true },
  },
  blockedDates: {
    where: { state: 'ACTIVE' as const },
    select: { startDate: true, endDate: true },
  },
} as const;

type AvailabilityVillaRecord = Prisma.VillaGetPayload<{ select: typeof VILLA_SELECT }>;

@Injectable()
export class OccupancyService {
  constructor(private prisma: PrismaService) {}

  async withVillaLock<T>(
    villaId: string,
    work: (tx: Prisma.TransactionClient, now: Date) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const locked = await tx.$queryRaw<{ id: string }[]>`
              SELECT id FROM "Villa" WHERE id = ${villaId} FOR UPDATE
            `;
            if (!locked.length) throw new NotFoundException('Villa bulunamadı.');

            const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
            const expired = await tx.booking.findMany({
              where: { villaId, status: 'HOLD', holdExpiresAt: { lte: now } },
              select: { id: true, holdExpiresAt: true },
            });
            await tx.booking.updateMany({
              where: { id: { in: expired.map((booking) => booking.id) } },
              data: { status: 'EXPIRED', version: { increment: 1 } },
            });
            if (expired.length) {
              await tx.calendarAudit.createMany({
                data: expired.map((booking) => ({
                  villaId,
                  entityType: 'BOOKING',
                  entityId: booking.id,
                  action: 'HOLD_EXPIRED',
                  before: { status: 'HOLD', holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null },
                  after: { status: 'EXPIRED' },
                })),
              });
            }
            return work(tx, now);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5_000, timeout: 10_000 },
        );
      } catch (error) {
        if (
          attempt === 0 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  async checkAvailability(
    tx: Prisma.TransactionClient,
    villaId: string,
    dates: StayDates,
    guests: GuestCounts,
    excludeBookingId?: string,
  ) {
    const villa = await tx.villa.findUnique({ where: { id: villaId }, select: VILLA_SELECT });
    if (!villa || villa.status !== 'PUBLISHED') throw new NotFoundException('Rezervasyona açık villa bulunamadı.');

    const result = evaluateAvailability(villa, dates, guests);
    const bookingConflict = await tx.booking.findFirst({
      where: {
        villaId,
        status: { in: ['HOLD', 'CONFIRMED'] },
        checkIn: { lt: dates.checkOut },
        checkOut: { gt: dates.checkIn },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { id: true },
    });
    if (bookingConflict && !result.reasons.includes('DATES_UNAVAILABLE')) {
      result.reasons.push('DATES_UNAVAILABLE');
      result.available = false;
    }
    return { villa, result };
  }

  quote(villa: AvailabilityVillaRecord, dates: StayDates) {
    const nights: { date: string; amount: number }[] = [];
    for (let cursor = dates.checkIn.getTime(); cursor < dates.checkOut.getTime(); cursor += 86_400_000) {
      const day = new Date(cursor);
      const rule = villa.priceRules.find((candidate) => candidate.startDate <= day && candidate.endDate > day);
      nights.push({ date: day.toISOString().slice(0, 10), amount: rule?.pricePerNight ?? villa.pricePerNight });
    }
    const accommodationAmount = nights.reduce((sum, night) => sum + night.amount, 0);
    const cleaningFeeAmount = dates.nights < villa.cleaningFeeThresholdNights ? villa.cleaningFee : 0;
    return {
      currency: villa.currency,
      accommodationAmount,
      cleaningFeeAmount,
      depositAmount: villa.depositAmount,
      totalAmount: accommodationAmount + cleaningFeeAmount,
      priceSnapshot: { nights, cleaningFeeAmount, depositAmount: villa.depositAmount },
    };
  }
}
