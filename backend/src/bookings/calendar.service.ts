import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { formatCalendarDate, parseStayDates } from '../villas/availability';

type CalendarQuery = {
  from: string;
  to: string;
  villaId?: string;
  regionId?: string;
};

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async range(input: CalendarQuery, hostId?: string) {
    const dates = parseStayDates(input.from, input.to);
    if (dates.nights > 62) throw new BadRequestException('Takvim en fazla 62 günlük açılabilir.');

    const villaWhere: Prisma.VillaWhereInput = {
      ...(hostId ? { hostId } : {}),
      ...(input.villaId ? { id: input.villaId } : {}),
      ...(input.regionId ? { regionId: input.regionId } : {}),
    };
    const villas = await this.prisma.villa.findMany({
      where: villaWhere,
      select: { id: true, title: true, status: true, region: { select: { id: true, name: true } } },
      orderBy: [{ region: { name: 'asc' } }, { title: 'asc' }],
    });
    const villaIds = villas.map((villa) => villa.id);
    const now = new Date();
    const [bookings, blocks] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          villaId: { in: villaIds },
          checkIn: { lt: dates.checkOut },
          checkOut: { gt: dates.checkIn },
          OR: [
            { status: 'CONFIRMED' },
            { status: 'HOLD', holdExpiresAt: { gt: now } },
          ],
        },
        select: {
          id: true,
          villaId: true,
          status: true,
          checkIn: true,
          checkOut: true,
          adults: true,
          children: true,
          infants: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          holdExpiresAt: true,
          totalAmount: true,
          currency: true,
          version: true,
          guest: { select: { name: true, email: true, phone: true } },
        },
      }),
      this.prisma.villaBlockedDate.findMany({
        where: {
          villaId: { in: villaIds },
          state: 'ACTIVE',
          startDate: { lt: dates.checkOut },
          endDate: { gt: dates.checkIn },
        },
        select: {
          id: true,
          villaId: true,
          startDate: true,
          endDate: true,
          kind: true,
          note: true,
          version: true,
        },
      }),
    ]);

    return {
      from: input.from,
      to: input.to,
      villas,
      events: [
        ...bookings.map((booking) => ({
          id: booking.id,
          villaId: booking.villaId,
          source: 'BOOKING' as const,
          kind: booking.status,
          startDate: formatCalendarDate(booking.checkIn),
          endDate: formatCalendarDate(booking.checkOut),
          title: hostId ? 'Rezervasyon' : booking.customerName ?? booking.guest?.name ?? 'Rezervasyon',
          email: hostId ? null : booking.customerEmail ?? booking.guest?.email ?? null,
          phone: hostId ? null : booking.customerPhone ?? booking.guest?.phone ?? null,
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
          holdExpiresAt: booking.holdExpiresAt,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          version: booking.version,
        })),
        ...blocks.map((block) => ({
          id: block.id,
          villaId: block.villaId,
          source: 'BLOCK' as const,
          kind: block.kind,
          startDate: formatCalendarDate(block.startDate),
          endDate: formatCalendarDate(block.endDate),
          title: block.note || this.blockLabel(block.kind),
          note: block.note,
          version: block.version,
        })),
      ],
    };
  }

  async audit(villaId: string | undefined, limit = 50, hostId?: string) {
    return this.prisma.calendarAudit.findMany({
      where: {
        ...(villaId ? { villaId } : {}),
        ...(hostId ? { villa: { hostId } } : {}),
      },
      select: {
        id: true,
        villaId: true,
        entityType: true,
        entityId: true,
        action: true,
        reason: true,
        before: true,
        after: true,
        createdAt: true,
        villa: { select: { title: true } },
        actor: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  private blockLabel(kind: string) {
    return kind === 'MAINTENANCE' ? 'Bakım' : kind === 'OWNER_USE' ? 'Ev sahibi kullanımı' : 'Satışa kapalı';
  }
}
