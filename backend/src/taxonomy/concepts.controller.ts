import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ConceptInputDto, ReorderDto } from './dto';
import { TaxonomyService } from './taxonomy.service';

@Controller('admin/concepts')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminConceptsController {
  constructor(private taxonomy: TaxonomyService) {}

  @Get()
  list() {
    return this.taxonomy.list('concept');
  }

  @Post()
  create(@Body() dto: ConceptInputDto) {
    if (!dto.name || !dto.image) throw new BadRequestException('Ad ve görsel zorunlu.');
    return this.taxonomy.create('concept', {
      name: dto.name,
      subtitle: dto.subtitle,
      description: dto.description,
      image: dto.image,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ConceptInputDto) {
    return this.taxonomy.update('concept', id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxonomy.remove('concept', id);
  }

  @Put('order')
  reorder(@Body() dto: ReorderDto) {
    return this.taxonomy.reorder('concept', dto.ids);
  }
}
