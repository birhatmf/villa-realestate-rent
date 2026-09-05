import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** Villa formundaki konsept seçimi için — regions.controller.ts ile aynı desen. */
@Controller('concepts')
export class ConceptsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.concept.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, name: true },
    });
  }
}
