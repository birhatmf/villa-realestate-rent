import {
  Body,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DocumentType, OwnershipType } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { memoryStorage } from 'multer';
import { HostApplicationsService, MAX_FILE_SIZE } from './host-applications.service';

const OWNERSHIP_TYPES = ['SOLE', 'SHARED', 'SITE'] as const;
const DOCUMENT_TYPES = [
  'PERMIT_CERTIFICATE',
  'PLAQUE_PHOTO',
  'TITLE_DEED',
  'ID_DOCUMENT',
  'FIRE_SAFETY_DECLARATION',
  'POWER_OF_ATTORNEY',
  'CONSENT_LETTER',
  'MANAGEMENT_DECISION',
  'OTHER',
] as const;

// TR + 24 rakam (boşluklar formdan gelirken temizlenir).
const IBAN_RE = /^TR[0-9]{24}$/;

class CreateApplicationDto {
  @IsString() @Length(2, 150) ownerName!: string;
  @IsString() @Length(4, 30) ownerIdNumber!: string;
  @IsString() @Length(6, 30) phone!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @Length(0, 120) uetsAddress?: string;

  @IsString()
  @Matches(IBAN_RE, { message: 'IBAN, TR ile başlamalı ve toplam 26 karakter olmalı.' })
  iban!: string;

  @IsString() @Length(5, 400) address!: string;
  @IsOptional() @IsString() @Length(0, 120) parcelNo?: string;
  @IsOptional() @IsString() @Length(0, 120) permitNumber?: string;
  @IsOptional() @IsInt() @Min(1) maxCapacity?: number;
  @IsOptional() @IsString() @Length(0, 120) kbsCode?: string;

  @IsIn(OWNERSHIP_TYPES) ownershipType!: OwnershipType;

  @IsString() @Length(2, 150) signatureName!: string;
}

@Controller('host-applications')
@UseGuards(ThrottlerGuard)
export class HostApplicationsController {
  constructor(private apps: HostApplicationsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Body() dto: CreateApplicationDto) {
    return this.apps.create({ ...dto, iban: dto.iban.toUpperCase() });
  }

  @Post(':id/documents')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }),
  )
  uploadDocument(
    @Param('id') id: string,
    @Body('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.apps.addDocument(id, type, file);
  }
}
