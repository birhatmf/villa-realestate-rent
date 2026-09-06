import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { VillasService } from './villas.service';

class FeaturedItemDto {
  @IsString() villaId!: string;
  @IsOptional() @IsDateString({ strict: true }) featuredUntil?: string | null;
}

class ReplaceFeaturedDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => FeaturedItemDto)
  items!: FeaturedItemDto[];
}

@Controller('admin/featured')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class FeaturedController {
  constructor(private villas: VillasService) {}

  @Get()
  list() {
    return this.villas.listFeatured();
  }

  @Put()
  replace(@Body() dto: ReplaceFeaturedDto) {
    return this.villas.replaceFeatured(dto.items);
  }
}
