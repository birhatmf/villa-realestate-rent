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
import { RegionInputDto, ReorderDto } from './dto';
import { TaxonomyService } from './taxonomy.service';

@Controller('admin/regions')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminRegionsController {
  constructor(private taxonomy: TaxonomyService) {}

  @Get()
  list() {
    return this.taxonomy.list('region');
  }

  @Post()
  create(@Body() dto: RegionInputDto) {
    if (!dto.name || !dto.image) throw new BadRequestException('Ad ve görsel zorunlu.');
    return this.taxonomy.create('region', { name: dto.name, subtitle: dto.subtitle, image: dto.image });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: RegionInputDto) {
    return this.taxonomy.update('region', id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxonomy.remove('region', id);
  }

  @Put('order')
  reorder(@Body() dto: ReorderDto) {
    return this.taxonomy.reorder('region', dto.ids);
  }
}
