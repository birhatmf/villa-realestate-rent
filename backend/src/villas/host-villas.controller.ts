import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import {
  assertCreateRequired,
  BlockedDateDto,
  BlockedDateVersionDto,
  IMAGE_CATEGORIES,
  ImageReorderDto,
  PriceRuleDto,
  VillaInputDto,
} from './dto';
import { MAX_IMAGE_SIZE, VillaImagesService } from './villa-images.service';
import { VillasService } from './villas.service';

class ListDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

class ImageUploadDto {
  @IsIn(IMAGE_CATEGORIES) category!: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() width?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() height?: number;
}

type Req = Request & { user: { sub: string } };

/** Host hiçbir zaman kendi komisyon oranını belirleyemez — JSON'a elle eklese bile sunucu düşürür. */
function stripHostOnlyFields(dto: VillaInputDto): VillaInputDto {
  const { commissionRate: _drop, ...rest } = dto;
  return rest;
}

/**
 * Admin da bu uçlara erişebilir (destek/müdahale için) ama `hostId` her zaman
 * kendi kullanıcı id'sine sabitlenir — admin burada kendi villası gibi davranır,
 * başka host'un villasını görmek için admin/villalar uçları var.
 */
@Controller('host/villas')
@UseGuards(JwtGuard, RolesGuard)
@Roles('HOST', 'ADMIN')
export class HostVillasController {
  constructor(
    private villas: VillasService,
    private images: VillaImagesService,
  ) {}

  @Get()
  list(@Query() query: ListDto, @Req() req: Req) {
    return this.villas.list({ ...query, hostId: req.user.sub });
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: Req) {
    return this.villas.getScoped(id, req.user.sub);
  }

  @Post()
  create(@Body() dto: VillaInputDto, @Req() req: Req) {
    const safe = stripHostOnlyFields(dto);
    assertCreateRequired(safe);
    return this.villas.create(safe as any, { hostId: req.user.sub, status: 'DRAFT' });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: VillaInputDto, @Req() req: Req) {
    return this.villas.update(id, stripHostOnlyFields(dto) as any, req.user.sub, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Req) {
    return this.villas.remove(id, req.user.sub);
  }

  /** DRAFT/REJECTED → PENDING_REVIEW. ≥15 görsel şartı serviste kontrol edilir. */
  @Patch(':id/submit')
  submit(@Param('id') id: string, @Req() req: Req) {
    return this.villas.submitForReview(id, req.user.sub);
  }

  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE } }),
  )
  uploadImage(
    @Param('id') id: string,
    @Body() dto: ImageUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Req,
  ) {
    return this.images.add(id, dto.category, file, dto, req.user.sub);
  }

  @Patch(':id/images/:imageId')
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: ImageReorderDto,
    @Req() req: Req,
  ) {
    return this.images.reorderOrCover(id, imageId, dto, req.user.sub);
  }

  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string, @Req() req: Req) {
    return this.images.remove(id, imageId, req.user.sub);
  }

  @Post(':id/price-rules')
  addPriceRule(@Param('id') id: string, @Body() dto: PriceRuleDto, @Req() req: Req) {
    return this.villas.addPriceRule(id, dto, req.user.sub, req.user.sub);
  }

  @Delete(':id/price-rules/:ruleId')
  removePriceRule(@Param('id') id: string, @Param('ruleId') ruleId: string, @Req() req: Req) {
    return this.villas.removePriceRule(id, ruleId, req.user.sub, req.user.sub);
  }

  @Post(':id/blocked-dates')
  addBlockedDate(@Param('id') id: string, @Body() dto: BlockedDateDto, @Req() req: Req) {
    return this.villas.addBlockedDate(id, dto, req.user.sub, req.user.sub);
  }

  @Delete(':id/blocked-dates/:blockId')
  removeBlockedDate(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @Body() dto: BlockedDateVersionDto,
    @Req() req: Req,
  ) {
    return this.villas.removeBlockedDate(id, blockId, dto.version, req.user.sub, req.user.sub);
  }
}
