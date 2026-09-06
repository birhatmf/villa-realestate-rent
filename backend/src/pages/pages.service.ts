import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VillasService } from '../villas/villas.service';

type Content = Record<string, any>;

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService, private villas: VillasService) {}

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { sections: { where: { visible: true }, orderBy: { order: 'asc' } } },
    });
    if (!page) throw new NotFoundException(`Sayfa bulunamadı: ${slug}`);

    const sections = await Promise.all(
      page.sections.map(async (s) => ({
        id: s.id,
        type: s.type,
        content: await this.hydrate(s.type, (s.content ?? {}) as Content),
      })),
    );

    return {
      slug: page.slug,
      title: page.title,
      seo: { title: page.seoTitle, description: page.seoDescription },
      sections,
    };
  }

  /** Dinamik bloklara veriyi burada bağlıyoruz; frontend sadece render eder. */
  async hydrate(type: string, content: Content): Promise<Content> {
    if (type === 'featuredVillas') {
      const rows = await this.prisma.villa.findMany({
        where: {
          status: 'PUBLISHED',
          salesStatus: 'OPEN',
          featured: true,
          OR: [{ featuredUntil: null }, { featuredUntil: { gte: new Date() } }],
        },
        include: {
          region: { select: { name: true, slug: true } },
          images: { orderBy: { order: 'asc' }, take: 2 },
          priceRules: { select: { pricePerNight: true } },
        },
        orderBy: [
          { featuredOrder: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        take: content.limit ?? 8,
      });
      const villas = rows.map((villa) => this.villas.toCardData(villa));
      return { ...content, villas };
    }

    if (type === 'regionGrid') {
      const regions = await this.prisma.region.findMany({
        orderBy: { order: 'asc' },
        take: content.limit ?? 8,
        include: { _count: { select: { villas: { where: { status: 'PUBLISHED' } } } } },
      });
      return {
        ...content,
        regions: regions.map(({ _count, ...r }) => ({ ...r, villaCount: _count.villas })),
      };
    }

    if (type === 'conceptGrid') {
      const concepts = await this.prisma.concept.findMany({
        orderBy: { order: 'asc' },
        take: content.limit ?? 4,
        include: { _count: { select: { villas: { where: { status: 'PUBLISHED' } } } } },
      });
      return {
        ...content,
        concepts: concepts.map(({ _count, ...c }) => ({ ...c, villaCount: _count.villas })),
      };
    }

    return content;
  }
}
