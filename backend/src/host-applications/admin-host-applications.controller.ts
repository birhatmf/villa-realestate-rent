import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { ApplicationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import type { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { HostApplicationsService } from './host-applications.service';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

class ListDto {
  @IsOptional() @IsIn(STATUSES) status?: ApplicationStatus;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

class ReviewDto {
  @IsIn(['APPROVED', 'REJECTED']) status!: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() @Length(0, 2000) adminNote?: string;
}

@Controller('admin/host-applications')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminHostApplicationsController {
  constructor(private apps: HostApplicationsService) {}

  @Get()
  list(@Query() query: ListDto) {
    return this.apps.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.apps.get(id);
  }

  @Patch(':id')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.apps.review(id, dto.status, dto.adminNote, req.user.sub);
  }

  @Get(':id/documents/:docId/download')
  async download(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { doc, path } = await this.apps.getDocumentFile(id, docId);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
    });
    return new StreamableFile(createReadStream(path));
  }

  @Delete(':id/documents/:docId')
  removeDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.apps.removeDocument(id, docId);
  }
}
