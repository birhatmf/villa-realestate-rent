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
import type { VillaStatus } from '@prisma/client';
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
  ReviewVillaDto,
  VillaInputDto,
} from './dto';
import { MAX_IMAGE_SIZE, VillaImagesService } from './villa-images.service';
import { VillasService } from './villas.service';

const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] as const;

class ListDto {
  @IsOptional() @IsIn(STATUSES) status?: VillaStatus;
  @IsOptional() @IsString() regionId?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

class ImageUploadDto {
  @IsIn(IMAGE_CATEGORIES) category!: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() width?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() height?: number;
}

@Controller('admin/villas')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminVillasController {
  constructor(
    private villas: VillasService,
    private images: VillaImagesService,
  ) {}

  @Get()
  list(@Query() query: ListDto) {
    return this.villas.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.villas.get(id);
  }

  @Post()
  create(@Body() dto: VillaInputDto) {
    assertCreateRequired(dto);
    return this.villas.create(dto as any, { status: 'DRAFT' });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: VillaInputDto, @Req() req: Request & { user: { sub: string } }) {
    return this.villas.update(id, dto as any, undefined, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.villas.remove(id);
  }

  @Patch(':id/status')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewVillaDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.villas.review(id, dto.status, dto.reviewNote, req.user.sub);
  }

  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE } }),
  )
  uploadImage(
    @Param('id') id: string,
    @Body() dto: ImageUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.images.add(id, dto.category, file, dto);
  }

  @Patch(':id/images/:imageId')
  updateImage(@Param('id') id: string, @Param('imageId') imageId: string, @Body() dto: ImageReorderDto) {
    return this.images.reorderOrCover(id, imageId, dto);
  }

  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.images.remove(id, imageId);
  }

  @Post(':id/price-rules')
  addPriceRule(@Param('id') id: string, @Body() dto: PriceRuleDto, @Req() req: Request & { user: { sub: string } }) {
    return this.villas.addPriceRule(id, dto, undefined, req.user.sub);
  }

  @Delete(':id/price-rules/:ruleId')
  removePriceRule(@Param('id') id: string, @Param('ruleId') ruleId: string, @Req() req: Request & { user: { sub: string } }) {
    return this.villas.removePriceRule(id, ruleId, undefined, req.user.sub);
  }

  @Post(':id/blocked-dates')
  addBlockedDate(@Param('id') id: string, @Body() dto: BlockedDateDto, @Req() req: Request & { user: { sub: string } }) {
    return this.villas.addBlockedDate(id, dto, undefined, req.user.sub);
  }

  @Delete(':id/blocked-dates/:blockId')
  removeBlockedDate(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @Body() dto: BlockedDateVersionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.villas.removeBlockedDate(id, blockId, dto.version, undefined, req.user.sub);
  }
}
