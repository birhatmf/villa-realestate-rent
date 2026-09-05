import { Controller, Get, Param } from '@nestjs/common';
import { PagesService } from './pages.service';

@Controller('pages')
export class PagesController {
  constructor(private pages: PagesService) {}

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.pages.findBySlug(slug);
  }
}
