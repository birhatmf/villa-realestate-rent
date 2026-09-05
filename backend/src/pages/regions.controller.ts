import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** Villa formundaki bölge seçimi için — zaten ana sayfada herkese açık gösterilen veri. */
@Controller('regions')
export class RegionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.region.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, name: true },
    });
  }
}
