import {
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
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

class PreviewDto {
  @IsString() type!: string;
  @IsObject() content!: Record<string, any>;
}

class AddSectionDto {
  @IsString() type!: string;
  @IsObject() content!: Record<string, any>;
  @IsOptional() @IsInt() @Min(0) index?: number;
}

class UpdateSectionDto {
  @IsOptional() @IsObject() content?: Record<string, any>;
  @IsOptional() @IsBoolean() visible?: boolean;
}

class ReorderDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
}

class CreatePageDto {
  @IsString() @MinLength(2) @MaxLength(100) @Matches(/\S/, { message: 'başlık boş olamaz' }) title!: string;
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug yalnızca küçük harf, rakam ve tire içerebilir',
  })
  @MaxLength(100)
  slug!: string;
}

class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/\S/, { message: 'başlık boş olamaz' })
  title?: string;
  @IsOptional() @IsString() @MaxLength(160) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
}

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('pages')
  listPages() {
    return this.admin.listPages();
  }

  @Post('pages')
  createPage(@Body() dto: CreatePageDto) {
    return this.admin.createPage(dto);
  }

  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) {
    return this.admin.getPage(slug);
  }

  @Patch('pages/:pageId')
  updatePage(@Param('pageId') pageId: string, @Body() dto: UpdatePageDto) {
    return this.admin.updatePage(pageId, dto);
  }

  @Post('preview')
  preview(@Body() dto: PreviewDto) {
    return this.admin.preview(dto.type, dto.content);
  }

  @Post('pages/:pageId/sections')
  addSection(@Param('pageId') pageId: string, @Body() dto: AddSectionDto) {
    return this.admin.addSection(pageId, dto.type, dto.content, dto.index);
  }

  @Put('pages/:pageId/sections/order')
  reorder(@Param('pageId') pageId: string, @Body() dto: ReorderDto) {
    return this.admin.reorder(pageId, dto.ids);
  }

  @Patch('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.admin.updateSection(id, dto);
  }

  @Delete('sections/:id')
  removeSection(@Param('id') id: string) {
    return this.admin.removeSection(id);
  }
}
