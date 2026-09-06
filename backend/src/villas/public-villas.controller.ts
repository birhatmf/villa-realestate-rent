import { Controller, Get, Param, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type { PublicSort } from './villas.service';
import { VillasService } from './villas.service';

const SORTS = ['yeni', 'fiyat_artan', 'fiyat_azalan'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class PublicListDto {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsString() @MaxLength(200) bolge?: string;
  @IsOptional() @IsString() @MaxLength(200) konsept?: string;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(60) guests?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(20) adults?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) @Max(12) children?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) @Max(10) infants?: number;

  @IsOptional() @IsString() @Matches(DATE_RE) from?: string;
  @IsOptional() @IsString() @Matches(DATE_RE) to?: string;

  @IsOptional() @IsIn(SORTS) sort?: PublicSort;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(48) pageSize?: number;
}

class AvailabilityDto {
  @IsString() @Matches(DATE_RE) from!: string;
  @IsString() @Matches(DATE_RE) to!: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(20) adults?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) @Max(12) children?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) @Max(10) infants?: number;
}

/** Yalnızca yayında olan villalar. Guard yok. */
@Controller('villas')
export class PublicVillasController {
  constructor(private villas: VillasService) {}

  @Get()
  list(@Query() query: PublicListDto) {
    return this.villas.listPublic(query);
  }

  @Get(':slug/availability')
  availability(@Param('slug') slug: string, @Query() query: AvailabilityDto) {
    return this.villas.checkPublicAvailability(slug, query);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.villas.getPublic(slug);
  }
}
