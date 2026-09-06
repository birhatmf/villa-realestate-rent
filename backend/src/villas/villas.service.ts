import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, VillaBlockedDateKind, VillaStatus } from '@prisma/client';
import { rm } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma.service';
import {
  evaluateAvailability,
  formatCalendarDate,
  parseCalendarDate,
  parseStayDates,
} from './availability';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads', 'villas');

export type RoomInput = {
  bedType: string;
  bedCount?: number;
  hasEnsuite?: boolean;
  hasJacuzzi?: boolean;
  note?: string;
};

/** Villa scalar alanları — ilişkiler (rooms/images/priceRules/blockedDates) ayrı uçlarla yönetilir. */
export type VillaInput = {
  title: string;
  summary?: string;
  regionId: string;
  district?: string;
  buildingType: string;
  permitNumber?: string;
  maxAdults: number;
  maxChildren?: number;
  maxInfants?: number;
  bedrooms: number;
  bathrooms: number;
  poolType?: string;
  poolSecluded?: boolean;
  poolHeated?: boolean;
  poolHeatingIncluded?: boolean;
  poolHeatingFeePerDay?: number;
  poolHasChildPool?: boolean;
  poolLengthM?: number;
  poolWidthM?: number;
  poolDepthM?: number;
  wifiMbps?: number;
  beachDistanceM?: number;
  nearCenter?: boolean;
  viewTags?: string[];
  amenities?: string[];
  pricePerNight: number;
  currency?: string;
  minNights?: number;
  cleaningFee?: number;
  cleaningFeeThresholdNights?: number;
  depositAmount?: number;
  utilitiesIncluded?: boolean;
  gasIncluded?: boolean;
  extraCleaningFee?: number;
  petPolicy?: string;
  petNote?: string;
  familiesOnly?: boolean;
  allowSingleMaleGroups?: boolean;
  allowYoungGroups?: boolean;
  eventsAllowed?: boolean;
  smokingAllowed?: boolean;
  customRules?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  checkInWeekday?: number | null;
  videoUrl?: string;
  commissionRate?: number;
  rooms?: RoomInput[];
  conceptIds?: string[];
};

export type ListParams = {
  hostId?: string;
  status?: VillaStatus;
  regionId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type PublicSort = 'yeni' | 'fiyat_artan' | 'fiyat_azalan';

/** Halka açık listeleme parametreleri — `status`/`hostId` bilinçli olarak YOK. */
export type PublicListParams = {
  q?: string;
  bolge?: string;
  konsept?: string;
  guests?: number;
  adults?: number;
  children?: number;
  infants?: number;
  from?: string;
  to?: string;
  sort?: PublicSort;
  page?: number;
  pageSize?: number;
};

const slugify = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const DETAIL_INCLUDE = {
  region: { select: { name: true, slug: true } },
  rooms: { orderBy: { order: 'asc' as const } },
  images: { orderBy: { order: 'asc' as const } },
  priceRules: { orderBy: { startDate: 'asc' as const } },
  blockedDates: { where: { state: 'ACTIVE' as const }, orderBy: { startDate: 'asc' as const } },
  concepts: { select: { id: true, name: true, slug: true } },
};

/** Public detay alanları allowlist'tir; yeni iç alanlar yanlışlıkla API'ye eklenmez. */
const PUBLIC_DETAIL_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  regionId: true,
  district: true,
  buildingType: true,
  permitNumber: true,
  maxAdults: true,
  maxChildren: true,
  maxInfants: true,
  capacity: true,
  bedrooms: true,
  bathrooms: true,
  poolType: true,
  poolSecluded: true,
  poolHeated: true,
  poolHeatingIncluded: true,
  poolHeatingFeePerDay: true,
  poolHasChildPool: true,
  poolLengthM: true,
  poolWidthM: true,
  poolDepthM: true,
  wifiMbps: true,
  beachDistanceM: true,
  nearCenter: true,
  viewTags: true,
  amenities: true,
  pricePerNight: true,
  currency: true,
  minNights: true,
  cleaningFee: true,
  cleaningFeeThresholdNights: true,
  depositAmount: true,
  utilitiesIncluded: true,
  gasIncluded: true,
  extraCleaningFee: true,
  petPolicy: true,
  petNote: true,
  familiesOnly: true,
  allowSingleMaleGroups: true,
  allowYoungGroups: true,
  eventsAllowed: true,
  smokingAllowed: true,
  customRules: true,
  checkInTime: true,
  checkOutTime: true,
  checkInWeekday: true,
  videoUrl: true,
  rating: true,
  reviewCount: true,
  timezone: true,
  salesStatus: true,
  region: { select: { name: true, slug: true } },
  concepts: { select: { id: true, name: true, slug: true } },
  rooms: {
    orderBy: { order: 'asc' as const },
    select: { bedType: true, bedCount: true, hasEnsuite: true, hasJacuzzi: true, note: true },
  },
  images: {
    orderBy: { order: 'asc' as const },
    select: { id: true, category: true, url: true, order: true, isCover: true, width: true, height: true },
  },
  priceRules: {
    orderBy: { startDate: 'asc' as const },
    select: { id: true, startDate: true, endDate: true, pricePerNight: true, minNights: true },
  },
  blockedDates: {
    where: { state: 'ACTIVE' as const },
    orderBy: { startDate: 'asc' as const },
    select: { startDate: true, endDate: true },
  },
} as const;

@Injectable()
export class VillasService {
  constructor(private prisma: PrismaService) {}

  async list({ hostId, status, regionId, q, page = 1, pageSize = 20 }: ListParams) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const where: Prisma.VillaWhereInput = {
      ...(hostId ? { hostId } : {}),
      ...(status ? { status } : {}),
      ...(regionId ? { regionId } : {}),
      ...(q?.trim() ? { title: { contains: q.trim(), mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.villa.findMany({
        where,
        include: {
          region: { select: { name: true, slug: true } },
          images: { where: { isCover: true }, take: 1 },
          priceRules: { select: { pricePerNight: true } },
          _count: { select: { images: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.villa.count({ where }),
    ]);

    return { items: items.map((v) => this.withPriceRange(v)), total, page: Math.max(page, 1), pageSize: take };
  }

  listFeatured() {
    return this.prisma.villa.findMany({
      where: { featured: true },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        featuredOrder: true,
        featuredUntil: true,
        region: { select: { name: true, slug: true } },
        images: { where: { isCover: true }, select: { url: true }, take: 1 },
      },
      orderBy: [
        { featuredOrder: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
  }

  async replaceFeatured(items: { villaId: string; featuredUntil?: string | null }[]) {
    const ids = items.map((item) => item.villaId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Aynı villa birden fazla öne çıkan slota eklenemez.');
    }

    const published = await this.prisma.villa.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (published.length !== ids.length) {
      throw new BadRequestException('Yalnızca yayındaki villalar öne çıkarılabilir.');
    }

    await this.prisma.$transaction([
      this.prisma.villa.updateMany({
        where: { featured: true },
        data: { featured: false, featuredOrder: null, featuredUntil: null },
      }),
      ...items.map((item, index) =>
        this.prisma.villa.update({
          where: { id: item.villaId },
          data: {
            featured: true,
            featuredOrder: index,
            featuredUntil: item.featuredUntil
              ? new Date(`${item.featuredUntil}T23:59:59.999Z`)
              : null,
          },
        }),
      ),
    ]);

    return this.listFeatured();
  }

  async get(id: string) {
    const villa = await this.prisma.villa.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!villa) throw new NotFoundException('Villa bulunamadı.');
    return this.withPriceRange(villa);
  }

  /** hostId undefined → admin (kısıtsız). Dolu → yalnız kendi villası, aksi hâlde 404 (varlığını da sızdırmaz). */
  async getScoped(id: string, hostId?: string) {
    const villa = await this.get(id);
    if (hostId && villa.hostId !== hostId) throw new NotFoundException('Villa bulunamadı.');
    return villa;
  }

  /**
   * Halka açık listeleme. `list()` yeniden kullanılmıyor: o `status`/`hostId`'yi
   * dışarıdan kabul ediyor — burada `PUBLISHED` her zaman zorlanır, dışarıdan gelemez.
   */
  async listPublic({ q, bolge, konsept, guests, adults, children, infants, from, to, sort, page = 1, pageSize = 12 }: PublicListParams) {
    const take = Math.min(Math.max(pageSize, 1), 48);
    const skip = (Math.max(page, 1) - 1) * take;

    if (!!from !== !!to) throw new BadRequestException('Giriş ve çıkış tarihlerini birlikte seçin.');
    const dates = from && to ? parseStayDates(from, to) : null;
    const detailedGuests = adults !== undefined || children !== undefined || infants !== undefined;
    const availabilityRules: Prisma.VillaWhereInput[] = [];

    if (detailedGuests) {
      availabilityRules.push(
        { maxAdults: { gte: adults ?? 0 } },
        { maxChildren: { gte: children ?? 0 } },
        { maxInfants: { gte: infants ?? 0 } },
      );
    } else if (guests !== undefined) {
      availabilityRules.push({ capacity: { gte: guests } });
    }

    if (dates) {
      const coveringRule = {
        startDate: { lte: dates.checkIn },
        endDate: { gt: dates.checkIn },
        minNights: { not: null },
      };
      availabilityRules.push(
        {
          blockedDates: {
            none: {
              state: 'ACTIVE',
              startDate: { lt: dates.checkOut },
              endDate: { gt: dates.checkIn },
            },
          },
        },
        { OR: [{ checkInWeekday: null }, { checkInWeekday: dates.checkIn.getUTCDay() }] },
        {
          AND: [
            {
              priceRules: {
                none: { ...coveringRule, minNights: { gt: dates.nights } },
              },
            },
            {
              OR: [
                { priceRules: { some: coveringRule } },
                { AND: [{ priceRules: { none: coveringRule } }, { minNights: { lte: dates.nights } }] },
              ],
            },
          ],
        },
      );
    }

    const where: Prisma.VillaWhereInput = {
      status: 'PUBLISHED',
      salesStatus: 'OPEN',
      ...(q?.trim() ? { title: { contains: q.trim(), mode: 'insensitive' } } : {}),
      ...(bolge ? { region: { slug: bolge } } : {}),
      ...(konsept ? { concepts: { some: { slug: konsept } } } : {}),
      ...(availabilityRules.length ? { AND: availabilityRules } : {}),
    };

    const orderBy: Prisma.VillaOrderByWithRelationInput =
      sort === 'fiyat_artan'
        ? { pricePerNight: 'asc' }
        : sort === 'fiyat_azalan'
          ? { pricePerNight: 'desc' }
          : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.villa.findMany({
        where,
        include: {
          region: { select: { name: true, slug: true } },
          images: { orderBy: { order: 'asc' }, take: 2 },
          priceRules: { select: { pricePerNight: true } },
        },
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.villa.count({ where }),
    ]);

    return {
      items: items.map((v) => this.toCardData(v)),
      total,
      page: Math.max(page, 1),
      pageSize: take,
    };
  }

  /**
   * Kart sözleşmesi (VillaCardData). Alanlar AÇIKÇA seçilir — spread kullanılmaz:
   * halka açık uçta `commissionRate` (komisyon marjımız), `reviewNote`, `hostId`,
   * `reviewedBy` gibi iç alanlar asla dışarı sızmamalı.
   */
  toCardData(villa: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    district: string | null;
    currency: string;
    capacity: number;
    bedrooms: number;
    bathrooms: number;
    rating: number;
    reviewCount: number;
    pricePerNight: number;
    priceRules: { pricePerNight: number }[];
    images: { url: string }[];
    region: { name: string; slug: string };
  }) {
    const prices = [villa.pricePerNight, ...villa.priceRules.map((r) => r.pricePerNight)];
    return {
      id: villa.id,
      slug: villa.slug,
      title: villa.title,
      summary: villa.summary,
      district: villa.district,
      region: villa.region,
      images: villa.images.map((i) => i.url),
      currency: villa.currency,
      capacity: villa.capacity,
      bedrooms: villa.bedrooms,
      bathrooms: villa.bathrooms,
      rating: villa.rating,
      reviewCount: villa.reviewCount,
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    };
  }

  /** Yayında olmayan villalar 404 — varlığını da sızdırmaz. Halka açık detay sayfası bunu kullanır. */
  async getPublic(slug: string) {
    const villa = await this.prisma.villa.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: PUBLIC_DETAIL_SELECT,
    });
    if (!villa) throw new NotFoundException('Villa bulunamadı.');

    return {
      ...this.withPriceRange(villa),
      priceRules: villa.priceRules.map((rule) => ({
        ...rule,
        startDate: formatCalendarDate(rule.startDate),
        endDate: formatCalendarDate(rule.endDate),
      })),
      blockedDates: villa.blockedDates.map((block) => ({
        startDate: formatCalendarDate(block.startDate),
        endDate: formatCalendarDate(block.endDate),
      })),
    };
  }

  async checkPublicAvailability(
    slug: string,
    input: { from: string; to: string; adults?: number; children?: number; infants?: number },
  ) {
    const dates = parseStayDates(input.from, input.to);
    const villa = await this.prisma.villa.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        salesStatus: true,
        minNights: true,
        checkInWeekday: true,
        maxAdults: true,
        maxChildren: true,
        maxInfants: true,
        priceRules: {
          where: { startDate: { lte: dates.checkIn }, endDate: { gt: dates.checkIn } },
          select: { startDate: true, endDate: true, minNights: true },
        },
        blockedDates: {
          where: {
            state: 'ACTIVE',
            startDate: { lt: dates.checkOut },
            endDate: { gt: dates.checkIn },
          },
          select: { startDate: true, endDate: true },
        },
      },
    });
    if (!villa) throw new NotFoundException('Villa bulunamadı.');

    return {
      from: formatCalendarDate(dates.checkIn),
      to: formatCalendarDate(dates.checkOut),
      ...evaluateAvailability(villa, dates, {
        adults: input.adults ?? 1,
        children: input.children ?? 0,
        infants: input.infants ?? 0,
      }),
    };
  }

  /** Baz fiyat + tüm sezonluk kurallar üzerinden gecelik min/max — kart ve detay sayfasında "₺X–₺Y" gösterimi için. */
  private withPriceRange<T extends { pricePerNight: number; priceRules: { pricePerNight: number }[] }>(
    villa: T,
  ) {
    const prices = [villa.pricePerNight, ...villa.priceRules.map((r) => r.pricePerNight)];
    return { ...villa, priceRange: { min: Math.min(...prices), max: Math.max(...prices) } };
  }

  async create(input: VillaInput, opts: { hostId?: string; status: VillaStatus }) {
    const slug = await this.uniqueSlug(input.title);
    const { rooms, conceptIds, ...rest } = input;

    // Bkz. mapScalars yorumu: Prisma'nın create/update union tipleriyle uğraşmak
    // yerine burada da bilinçli olarak gevşek tip kullanıyoruz.
    const data: any = {
      ...this.mapScalars(rest),
      slug,
      hostId: opts.hostId,
      status: opts.status,
      rooms: rooms?.length ? { create: rooms.map((r, i) => this.mapRoom(r, i)) } : undefined,
      concepts: conceptIds ? { connect: conceptIds.map((id) => ({ id })) } : undefined,
    };

    return this.prisma.villa.create({ data, include: DETAIL_INCLUDE });
  }

  async update(id: string, input: Partial<VillaInput>, hostId?: string) {
    const villa = await this.getScoped(id, hostId);
    const { rooms, conceptIds, ...rest } = input;

    return this.prisma.$transaction(async (tx) => {
      if (rooms) {
        await tx.villaRoom.deleteMany({ where: { villaId: id } });
        if (rooms.length) {
          await tx.villaRoom.createMany({
            data: rooms.map((r, i) => ({ villaId: id, ...this.mapRoom(r, i) })),
          });
        }
      }
      return tx.villa.update({
        where: { id: villa.id },
        data: {
          ...this.mapScalars(rest),
          concepts: conceptIds ? { set: conceptIds.map((id) => ({ id })) } : undefined,
        },
        include: DETAIL_INCLUDE,
      });
    });
  }

  async remove(id: string, hostId?: string) {
    await this.getScoped(id, hostId);
    await this.prisma.villa.delete({ where: { id } });
    // Cascade yalnızca ilişkili satırları siler; diskteki görsel klasörü ayrı temizlenir.
    await rm(join(UPLOAD_ROOT, id), { recursive: true, force: true }).catch(() => {});
    return { ok: true };
  }

  /** Yalnızca admin çağırır — controller seviyesinde @Roles('ADMIN') ile kısıtlı. */
  async review(id: string, status: 'PUBLISHED' | 'REJECTED', reviewNote: string | undefined, actorId: string) {
    const villa = await this.get(id);
    if (status === 'PUBLISHED' && villa.images.length < 15) {
      throw new BadRequestException('Yayınlamak için en az 15 fotoğraf gerekli.');
    }
    return this.prisma.villa.update({
      where: { id },
      data: { status, reviewNote, reviewedAt: new Date(), reviewedBy: actorId },
      include: DETAIL_INCLUDE,
    });
  }

  /** Host kendi villasını incelemeye gönderir: DRAFT/REJECTED → PENDING_REVIEW. */
  async submitForReview(id: string, hostId: string) {
    const villa = await this.getScoped(id, hostId);
    if (villa.images.length < 15) {
      throw new BadRequestException('Gönderebilmek için en az 15 fotoğraf yüklemelisiniz.');
    }
    return this.prisma.villa.update({
      where: { id },
      data: { status: 'PENDING_REVIEW' },
      include: DETAIL_INCLUDE,
    });
  }

  async addPriceRule(
    villaId: string,
    input: { startDate: string; endDate: string; pricePerNight: number; minNights?: number },
    hostId?: string,
  ) {
    await this.getScoped(villaId, hostId);
    const startDate = parseCalendarDate(input.startDate);
    const endDate = parseCalendarDate(input.endDate);
    if (!(startDate < endDate)) throw new BadRequestException('Bitiş tarihi başlangıçtan sonra olmalı.');

    const overlap = await this.prisma.villaPriceRule.findFirst({
      where: { villaId, startDate: { lt: endDate }, endDate: { gt: startDate } },
    });
    if (overlap) throw new BadRequestException('Bu tarih aralığı mevcut bir fiyat kuralıyla çakışıyor.');

    return this.prisma.villaPriceRule.create({
      data: { villaId, startDate, endDate, pricePerNight: input.pricePerNight, minNights: input.minNights },
    });
  }

  async removePriceRule(villaId: string, ruleId: string, hostId?: string) {
    await this.getScoped(villaId, hostId);
    await this.assertChild(this.prisma.villaPriceRule, ruleId, villaId, 'Fiyat kuralı');
    await this.prisma.villaPriceRule.delete({ where: { id: ruleId } });
    return { ok: true };
  }

  async addBlockedDate(
    villaId: string,
    input: { startDate: string; endDate: string; kind?: VillaBlockedDateKind; note?: string },
    hostId?: string,
  ) {
    await this.getScoped(villaId, hostId);
    const startDate = parseCalendarDate(input.startDate);
    const endDate = parseCalendarDate(input.endDate);
    if (!(startDate < endDate)) throw new BadRequestException('Bitiş tarihi başlangıçtan sonra olmalı.');
    return this.prisma.villaBlockedDate.create({
      data: { villaId, startDate, endDate, kind: input.kind ?? 'MANUAL', note: input.note },
    });
  }

  async removeBlockedDate(villaId: string, blockId: string, hostId?: string) {
    await this.getScoped(villaId, hostId);
    const block = await this.prisma.villaBlockedDate.findUnique({ where: { id: blockId } });
    if (!block || block.villaId !== villaId) throw new NotFoundException('Bloke tarih bulunamadı.');
    if (block.state === 'ACTIVE') {
      await this.prisma.villaBlockedDate.update({
        where: { id: blockId },
        data: { state: 'RELEASED', releasedAt: new Date() },
      });
    }
    return { ok: true };
  }

  private async assertChild(
    delegate: { findUnique: (args: any) => Promise<{ villaId: string } | null> },
    id: string,
    villaId: string,
    label: string,
  ) {
    const row = await delegate.findUnique({ where: { id } });
    if (!row || row.villaId !== villaId) throw new NotFoundException(`${label} bulunamadı.`);
  }

  private mapRoom(r: RoomInput, order: number) {
    return {
      order,
      bedType: r.bedType as any,
      bedCount: r.bedCount ?? 1,
      hasEnsuite: r.hasEnsuite ?? false,
      hasJacuzzi: r.hasJacuzzi ?? false,
      note: r.note,
    };
  }

  /**
   * capacity = maxAdults+maxChildren burada otomatik türetilir; form bu alanı hiç göndermez.
   * Dönüş tipi kasıtlı gevşek: Prisma'nın create/update input union'ları (checked/unchecked)
   * scalar FK (hostId) + relation alanlarını birlikte kullanınca birbirini dışlıyor; veri zaten
   * DTO'larda class-validator ile doğrulanmış, burada tip savaşının kazanacağı ek güvenlik yok.
   */
  private mapScalars(input: Partial<VillaInput>): Record<string, any> {
    const { maxAdults, maxChildren, rooms: _rooms, conceptIds: _conceptIds, ...rest } = input;
    return {
      ...rest,
      buildingType: rest.buildingType as any,
      poolType: rest.poolType as any,
      petPolicy: rest.petPolicy as any,
      ...(maxAdults !== undefined ? { maxAdults } : {}),
      ...(maxChildren !== undefined ? { maxChildren } : {}),
      ...(maxAdults !== undefined || maxChildren !== undefined
        ? { capacity: (maxAdults ?? 0) + (maxChildren ?? 0) }
        : {}),
    };
  }

  private async uniqueSlug(title: string) {
    const base = slugify(title) || 'villa';
    let slug = base;
    let n = 1;
    while (await this.prisma.villa.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }
}
