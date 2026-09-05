import { Controller, Get, Param } from '@nestjs/common';
import { VillasService } from './villas.service';

/** Yalnızca yayında olan villaların halka açık detayı. Guard yok. */
@Controller('villas')
export class PublicVillasController {
  constructor(private villas: VillasService) {}

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.villas.getPublic(slug);
  }
}
