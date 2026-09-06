import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** Villa formundaki konsept seçimi için — regions.controller.ts ile aynı desen. */
@Controller('concepts')
export class ConceptsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.concept.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true, slug: true, name: true, subtitle: true, description: true, image: true,
        _count: { select: { villas: { where: { status: 'PUBLISHED' } } } },
      },
    });
    return rows.map(({ _count, ...concept }) => ({ ...concept, villaCount: _count.villas }));
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const row = await this.prisma.concept.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, subtitle: true, description: true, image: true,
        _count: { select: { villas: { where: { status: 'PUBLISHED' } } } },
      },
    });
    if (!row) throw new NotFoundException('Konsept bulunamadı.');
    const { _count, ...concept } = row;
    return { ...concept, villaCount: _count.villas };
  }
}
