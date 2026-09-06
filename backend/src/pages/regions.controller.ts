import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** Villa formundaki bölge seçimi için — zaten ana sayfada herkese açık gösterilen veri. */
@Controller('regions')
export class RegionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.region.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true, slug: true, name: true, subtitle: true, image: true,
        _count: { select: { villas: { where: { status: 'PUBLISHED' } } } },
      },
    });
    return rows.map(({ _count, ...region }) => ({ ...region, villaCount: _count.villas }));
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const row = await this.prisma.region.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, subtitle: true, image: true,
        _count: { select: { villas: { where: { status: 'PUBLISHED' } } } },
      },
    });
    if (!row) throw new NotFoundException('Bölge bulunamadı.');
    const { _count, ...region } = row;
    return { ...region, villaCount: _count.villas };
  }
}
