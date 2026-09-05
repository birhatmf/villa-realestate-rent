import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type TaxonomyKind = 'region' | 'concept';

type Input = {
  name: string;
  subtitle?: string;
  description?: string;
  image: string;
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

/**
 * Region ve Concept aynı şekle sahip (slug/name/subtitle/image/order) —
 * tek servis, `kind` parametresiyle doğru Prisma delegate'e yönlenir.
 * Concept'te ekstra `description` alanı var; Region'da yok, o yüzden
 * data nesnesine koşullu ekleniyor.
 */
@Injectable()
export class TaxonomyService {
  constructor(private prisma: PrismaService) {}

  private delegate(kind: TaxonomyKind) {
    return kind === 'region' ? this.prisma.region : this.prisma.concept;
  }

  list(kind: TaxonomyKind) {
    return (this.delegate(kind) as any).findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { villas: true } } },
    });
  }

  async get(kind: TaxonomyKind, id: string) {
    const row = await (this.delegate(kind) as any).findUnique({
      where: { id },
      include: { _count: { select: { villas: true } } },
    });
    if (!row) throw new NotFoundException('Kayıt bulunamadı.');
    return row;
  }

  async create(kind: TaxonomyKind, input: Input) {
    const slug = await this.uniqueSlug(kind, input.name);
    const count = await (this.delegate(kind) as any).count();
    return (this.delegate(kind) as any).create({
      data: { ...input, slug, order: count },
    });
  }

  async update(kind: TaxonomyKind, id: string, input: Partial<Input>) {
    await this.get(kind, id);
    return (this.delegate(kind) as any).update({ where: { id }, data: input });
  }

  async remove(kind: TaxonomyKind, id: string) {
    const row = await this.get(kind, id);
    if (kind === 'region' && row._count.villas > 0) {
      throw new BadRequestException(
        `Bu bölgede ${row._count.villas} villa var — önce villaları başka bölgeye taşıyın.`,
      );
    }
    // Concept m2m: villa'lardan otomatik ayrılır, engelleme gerekmez.
    await (this.delegate(kind) as any).delete({ where: { id } });
    return { ok: true };
  }

  /** Sıra tam değiştirme — PageEditor'daki section reorder ile aynı desen. */
  async reorder(kind: TaxonomyKind, ids: string[]) {
    const existing = await (this.delegate(kind) as any).findMany({ select: { id: true } });
    const known = new Set(existing.map((r: { id: string }) => r.id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new BadRequestException('Sıralama listesi mevcut kayıtlarla eşleşmiyor.');
    }
    await this.prisma.$transaction(
      ids.map((id, i) => (this.delegate(kind) as any).update({ where: { id }, data: { order: i } })),
    );
    return { ok: true };
  }

  private async uniqueSlug(kind: TaxonomyKind, name: string) {
    const base = slugify(name) || kind;
    let slug = base;
    let n = 1;
    while (await (this.delegate(kind) as any).findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }
}
