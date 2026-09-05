import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Content = Record<string, any>;

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

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
        where: { status: 'PUBLISHED', ...(content.onlyFeatured === false ? {} : { featured: true }) },
        include: {
          region: { select: { name: true, slug: true } },
          images: { orderBy: { order: 'asc' }, take: 2 },
        },
        orderBy: { createdAt: 'desc' },
        take: content.limit ?? 6,
      });
      // FeaturedVillas.tsx `images: string[]` bekliyor — VillaImage ilişkisini
      // eski sözleşmeyi bozmadan burada düz URL dizisine indiriyoruz.
      const villas = rows.map(({ images, ...v }) => ({ ...v, images: images.map((i) => i.url) }));
      return { ...content, villas };
    }

    if (type === 'regionGrid') {
      const regions = await this.prisma.region.findMany({
        orderBy: { order: 'asc' },
        take: content.limit ?? 8,
        include: { _count: { select: { villas: true } } },
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
        include: { _count: { select: { villas: true } } },
      });
      return {
        ...content,
        concepts: concepts.map(({ _count, ...c }) => ({ ...c, villaCount: _count.villas })),
      };
    }

    return content;
  }
}
