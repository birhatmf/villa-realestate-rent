import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PagesService } from '../pages/pages.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private pages: PagesService,
  ) {}

  listPages() {
    return this.prisma.page.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        updatedAt: true,
        _count: { select: { sections: true } },
      },
    });
  }

  /**
   * Editör için sayfa: `content` düzenlenebilir ham JSON, `preview` ise
   * dinamik verisi bağlanmış hali. İkisini ayrı tutuyoruz — aksi halde
   * kaydederken hydrate edilmiş villa dizisi content'e geri yazılır.
   */
  async getPage(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!page) throw new NotFoundException(`Sayfa bulunamadı: ${slug}`);

    const sections = await Promise.all(
      page.sections.map(async (s) => ({
        id: s.id,
        type: s.type,
        order: s.order,
        visible: s.visible,
        content: s.content,
        preview: await this.pages.hydrate(s.type, (s.content ?? {}) as any),
      })),
    );

    return { id: page.id, slug: page.slug, title: page.title, sections };
  }

  /** Canlı öngösterim: kaydetmeden, girilen içerikle hydrate sonucunu döner. */
  preview(type: string, content: Record<string, any>) {
    return this.pages.hydrate(type, content ?? {});
  }

  async addSection(pageId: string, type: string, content: Prisma.InputJsonValue, index?: number) {
    const count = await this.prisma.section.count({ where: { pageId } });
    const at = index ?? count;

    return this.prisma.$transaction(async (tx) => {
      await tx.section.updateMany({
        where: { pageId, order: { gte: at } },
        data: { order: { increment: 1 } },
      });
      return tx.section.create({ data: { pageId, type, content, order: at } });
    });
  }

  async updateSection(id: string, data: { content?: Prisma.InputJsonValue; visible?: boolean }) {
    await this.assertSection(id);
    return this.prisma.section.update({ where: { id }, data });
  }

  async removeSection(id: string) {
    const section = await this.assertSection(id);
    await this.prisma.$transaction([
      this.prisma.section.delete({ where: { id } }),
      this.prisma.section.updateMany({
        where: { pageId: section.pageId, order: { gt: section.order } },
        data: { order: { decrement: 1 } },
      }),
    ]);
    return { ok: true };
  }

  /** Sıralama: gelen id dizisinin sırası yeni order olur. */
  async reorder(pageId: string, ids: string[]) {
    const existing = await this.prisma.section.findMany({
      where: { pageId },
      select: { id: true },
    });
    const known = new Set(existing.map((s) => s.id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new NotFoundException('Sıralama listesi sayfanın blokları ile eşleşmiyor.');
    }

    // Geçici negatif order — (pageId, order) üzerinde çakışma yaşamamak için.
    await this.prisma.$transaction([
      ...ids.map((id, i) =>
        this.prisma.section.update({ where: { id }, data: { order: -(i + 1) } }),
      ),
      ...ids.map((id, i) => this.prisma.section.update({ where: { id }, data: { order: i } })),
    ]);
    return { ok: true };
  }

  private async assertSection(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Blok bulunamadı.');
    return section;
  }
}
