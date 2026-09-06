import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type BookingStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { formatCalendarDate, parseStayDates } from '../villas/availability';
import type { AdminCreateBookingDto, ChangeBookingDto, CreateHoldDto } from './dto';
import { OccupancyService } from './occupancy.service';

const HOLD_MINUTES = 10;
const MAX_ACTIVE_HOLDS = 5;

const BOOKING_SELECT = {
  id: true,
  villaId: true,
  guestId: true,
  status: true,
  channel: true,
  checkIn: true,
  checkOut: true,
  adults: true,
  children: true,
  infants: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  currency: true,
  accommodationAmount: true,
  cleaningFeeAmount: true,
  depositAmount: true,
  totalAmount: true,
  priceSnapshot: true,
  holdExpiresAt: true,
  confirmedAt: true,
  cancelledAt: true,
  cancellationNote: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  villa: { select: { title: true, slug: true } },
} as const;

type BookingRecord = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private occupancy: OccupancyService,
  ) {}

  async createHold(input: CreateHoldDto, userId: string, idempotencyKey?: string) {
    const key = this.idempotencyKey(idempotencyKey);
    const owner = `guest:${userId}`;
    const normalized = this.normalizeStay(input);
    const requestHash = this.hash({ villaId: input.villaId, ...normalized });

    try {
      return await this.occupancy.withVillaLock(input.villaId, async (tx, now) => {
        const existing = await this.findIdempotent(tx, owner, key, requestHash);
        if (existing) return this.response(existing);

        const guest = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "User" WHERE id = ${userId} AND active = true FOR UPDATE
        `;
        if (!guest.length) throw new ForbiddenException('Aktif misafir hesabı bulunamadı.');
        const activeHolds = await tx.booking.count({
          where: { guestId: userId, status: 'HOLD', holdExpiresAt: { gt: now } },
        });
        if (activeHolds >= MAX_ACTIVE_HOLDS) {
          throw new ConflictException({
            message: 'Aynı anda en fazla beş villa bekletebilirsiniz.',
            code: 'ACTIVE_HOLD_LIMIT',
          });
        }

        const dates = parseStayDates(input.from, input.to);
        const { villa, result } = await this.occupancy.checkAvailability(tx, input.villaId, dates, normalized);
        this.assertAvailable(result.reasons);
        const quote = this.occupancy.quote(villa, dates);
        const booking = await tx.booking.create({
          data: {
            villaId: input.villaId,
            guestId: userId,
            status: 'HOLD',
            channel: 'WEBSITE',
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            ...normalized,
            ...quote,
            priceSnapshot: quote.priceSnapshot as Prisma.InputJsonValue,
            holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
            idempotencyOwner: owner,
            idempotencyKey: key,
            requestHash,
          },
          select: BOOKING_SELECT,
        });
        return this.response(booking);
      });
    } catch (error) {
      return this.recoverIdempotency(error, owner, key, requestHash);
    }
  }

  async createConfirmed(input: AdminCreateBookingDto, actorId: string, idempotencyKey?: string) {
    if (!input.guestId && (!input.customerName || (!input.customerEmail && !input.customerPhone))) {
      throw new BadRequestException('Üye veya misafir adıyla birlikte e-posta/telefon gerekli.');
    }
    const key = this.idempotencyKey(idempotencyKey);
    const owner = `admin:${actorId}`;
    const normalized = this.normalizeStay(input);
    const requestHash = this.hash({
      villaId: input.villaId,
      guestId: input.guestId ?? null,
      customerName: input.customerName?.trim() ?? null,
      customerEmail: input.customerEmail?.trim().toLowerCase() ?? null,
      customerPhone: input.customerPhone?.trim() ?? null,
      ...normalized,
    });

    try {
      return await this.occupancy.withVillaLock(input.villaId, async (tx, now) => {
        const existing = await this.findIdempotent(tx, owner, key, requestHash);
        if (existing) return this.response(existing);
        if (input.guestId) {
          const guest = await tx.user.findUnique({ where: { id: input.guestId }, select: { active: true } });
          if (!guest?.active) throw new BadRequestException('Aktif üye bulunamadı.');
        }

        const dates = parseStayDates(input.from, input.to);
        const { villa, result } = await this.occupancy.checkAvailability(tx, input.villaId, dates, normalized);
        this.assertAvailable(result.reasons);
        const quote = this.occupancy.quote(villa, dates);
        const booking = await tx.booking.create({
          data: {
            villaId: input.villaId,
            guestId: input.guestId,
            status: 'CONFIRMED',
            channel: 'ADMIN',
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            ...normalized,
            customerName: input.customerName?.trim(),
            customerEmail: input.customerEmail?.trim().toLowerCase(),
            customerPhone: input.customerPhone?.trim(),
            ...quote,
            priceSnapshot: quote.priceSnapshot as Prisma.InputJsonValue,
            confirmedAt: now,
            idempotencyOwner: owner,
            idempotencyKey: key,
            requestHash,
          },
          select: BOOKING_SELECT,
        });
        return this.response(booking);
      });
    } catch (error) {
      return this.recoverIdempotency(error, owner, key, requestHash);
    }
  }

  async confirm(id: string, expectedVersion: number) {
    const target = await this.bookingTarget(id);
    return this.occupancy.withVillaLock(target.villaId, async (tx, now) => {
      const booking = await tx.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
      if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
      if (booking.status === 'CONFIRMED') return this.response(booking);
      this.assertVersion(booking.version, expectedVersion);
      if (booking.status !== 'HOLD') throw new ConflictException('Bu rezervasyon artık onaylanamaz.');

      const dates = { checkIn: booking.checkIn, checkOut: booking.checkOut, nights: this.nights(booking) };
      const { result } = await this.occupancy.checkAvailability(
        tx,
        booking.villaId,
        dates,
        { adults: booking.adults, children: booking.children, infants: booking.infants },
        booking.id,
      );
      this.assertAvailable(result.reasons);

      return this.response(await tx.booking.update({
        where: { id },
        data: { status: 'CONFIRMED', holdExpiresAt: null, confirmedAt: now, version: { increment: 1 } },
        select: BOOKING_SELECT,
      }));
    });
  }

  async change(id: string, input: ChangeBookingDto) {
    const target = await this.bookingTarget(id);
    const normalized = this.normalizeStay(input);
    const dates = parseStayDates(input.from, input.to);
    return this.occupancy.withVillaLock(target.villaId, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
      if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
      this.assertVersion(booking.version, input.version);
      if (!(['HOLD', 'CONFIRMED'] as BookingStatus[]).includes(booking.status)) {
        throw new ConflictException('Bu rezervasyon değiştirilemez.');
      }

      const { villa, result } = await this.occupancy.checkAvailability(tx, booking.villaId, dates, normalized, id);
      this.assertAvailable(result.reasons);
      const quote = this.occupancy.quote(villa, dates);
      return this.response(await tx.booking.update({
        where: { id },
        data: {
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
          ...normalized,
          ...quote,
          priceSnapshot: quote.priceSnapshot as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
        select: BOOKING_SELECT,
      }));
    });
  }

  async cancel(id: string, expectedVersion: number, note: string) {
    const target = await this.bookingTarget(id);
    return this.occupancy.withVillaLock(target.villaId, async (tx, now) => {
      const booking = await tx.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
      if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
      if (booking.status === 'CANCELLED') return this.response(booking);
      this.assertVersion(booking.version, expectedVersion);
      if (booking.status === 'EXPIRED') throw new ConflictException('Süresi dolmuş rezervasyon iptal edilemez.');
      return this.response(await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationNote: note.trim(),
          version: { increment: 1 },
        },
        select: BOOKING_SELECT,
      }));
    });
  }

  async releaseOwnHold(id: string, userId: string) {
    const target = await this.prisma.booking.findFirst({
      where: { id, guestId: userId },
      select: { villaId: true },
    });
    if (!target) throw new NotFoundException('Rezervasyon bulunamadı.');
    return this.occupancy.withVillaLock(target.villaId, async (tx, now) => {
      const booking = await tx.booking.findFirst({ where: { id, guestId: userId }, select: BOOKING_SELECT });
      if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
      if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') return this.response(booking);
      if (booking.status !== 'HOLD') throw new ForbiddenException('Onaylı rezervasyonu yalnızca destek ekibi iptal edebilir.');
      return this.response(await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationNote: 'Misafir bekletmeyi bıraktı.',
          version: { increment: 1 },
        },
        select: BOOKING_SELECT,
      }));
    });
  }

  async getOwn(id: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, guestId: userId }, select: BOOKING_SELECT });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
    return this.response(booking);
  }

  async getAdmin(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
    return this.response(booking);
  }

  async listAdmin(input: { status?: BookingStatus; villaId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(input.page ?? 1, 1);
    const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);
    const where: Prisma.BookingWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.villaId ? { villaId: input.villaId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        select: BOOKING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items: items.map((item) => this.response(item)), total, page, pageSize };
  }

  private normalizeStay(input: { adults: number; children?: number; infants?: number }) {
    return { adults: input.adults, children: input.children ?? 0, infants: input.infants ?? 0 };
  }

  private idempotencyKey(value?: string) {
    if (!value || !/^[A-Za-z0-9._:-]{8,100}$/.test(value)) {
      throw new BadRequestException('Idempotency-Key başlığı 8–100 güvenli karakter içermeli.');
    }
    return value;
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private async findIdempotent(
    tx: Prisma.TransactionClient,
    owner: string,
    key: string,
    requestHash: string,
  ) {
    const existing = await tx.booking.findUnique({
      where: { idempotencyOwner_idempotencyKey: { idempotencyOwner: owner, idempotencyKey: key } },
      select: { ...BOOKING_SELECT, requestHash: true },
    });
    if (existing && existing.requestHash !== requestHash) {
      throw new ConflictException('Bu idempotency anahtarı farklı bir istek için kullanılmış.');
    }
    return existing;
  }

  private async recoverIdempotency(error: unknown, owner: string, key: string, requestHash: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await this.prisma.booking.findUnique({
        where: { idempotencyOwner_idempotencyKey: { idempotencyOwner: owner, idempotencyKey: key } },
        select: { ...BOOKING_SELECT, requestHash: true },
      });
      if (existing?.requestHash === requestHash) return this.response(existing);
      throw new ConflictException('Bu idempotency anahtarı farklı bir istek için kullanılmış.');
    }
    throw error;
  }

  private assertAvailable(reasons: string[]) {
    if (reasons.length) {
      throw new ConflictException({
        message: 'Seçilen villa bu koşullarda müsait değil.',
        code: reasons[0],
        reasons,
      });
    }
  }

  private assertVersion(actual: number, expected: number) {
    if (actual !== expected) throw new ConflictException('Rezervasyon başka bir işlem tarafından değiştirildi.');
  }

  private async bookingTarget(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, select: { villaId: true } });
    if (!booking) throw new NotFoundException('Rezervasyon bulunamadı.');
    return booking;
  }

  private nights(booking: { checkIn: Date; checkOut: Date }) {
    return Math.round((booking.checkOut.getTime() - booking.checkIn.getTime()) / 86_400_000);
  }

  private response(booking: BookingRecord | (BookingRecord & { requestHash: string })) {
    const { requestHash: _requestHash, ...safeBooking } = booking as BookingRecord & {
      requestHash?: string;
    };
    return {
      ...safeBooking,
      checkIn: formatCalendarDate(booking.checkIn),
      checkOut: formatCalendarDate(booking.checkOut),
    };
  }
}
