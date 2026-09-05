import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const BUILDING_TYPES = ['DETACHED', 'SEMI_DETACHED', 'SITE', 'STONE_HOUSE', 'BUNGALOW'] as const;
const POOL_TYPES = ['NONE', 'PRIVATE', 'SHARED', 'INFINITY'] as const;
const PET_POLICIES = ['NOT_ALLOWED', 'ALLOWED_FREE', 'ALLOWED_FEE'] as const;
const BED_TYPES = ['DOUBLE', 'TWIN', 'SINGLE', 'BUNK', 'SOFA_BED'] as const;
export const IMAGE_CATEGORIES = ['LIVING_KITCHEN', 'POOL_GARDEN', 'BEDROOM', 'EXTERIOR_VIEW', 'OTHER'] as const;
const CURRENCIES = ['TRY', 'EUR', 'GBP', 'USD'] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class RoomDto {
  @IsIn(BED_TYPES) bedType!: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) bedCount?: number;
  @IsOptional() @IsBoolean() hasEnsuite?: boolean;
  @IsOptional() @IsBoolean() hasJacuzzi?: boolean;
  @IsOptional() @IsString() @Length(0, 200) note?: string;
}

/**
 * Create ve update aynı DTO'yu paylaşır — tüm alanlar @IsOptional().
 * "Oluşturmada zorunlu" kontrolü assertCreateRequired() ile serviste yapılır;
 * class-validator kalıtımı üzerinden required/optional ayrımı yapmak kırılgan,
 * bu daha az kod ve daha güvenilir.
 */
export class VillaInputDto {
  @IsOptional() @IsString() @Length(2, 150) title?: string;
  @IsOptional() @IsString() @Length(0, 2000) summary?: string;
  @IsOptional() @IsString() regionId?: string;
  @IsOptional() @IsString() @Length(0, 120) district?: string;

  @IsOptional() @IsIn(BUILDING_TYPES) buildingType?: string;
  @IsOptional() @IsString() @Length(0, 80) permitNumber?: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) maxAdults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) maxChildren?: number;
  @IsOptional() @IsInt() @Min(0) @Max(20) maxInfants?: number;
  @IsOptional() @IsInt() @Min(0) @Max(30) bedrooms?: number;
  @IsOptional() @IsInt() @Min(0) @Max(30) bathrooms?: number;

  @IsOptional() @IsIn(POOL_TYPES) poolType?: string;
  @IsOptional() @IsBoolean() poolSecluded?: boolean;
  @IsOptional() @IsBoolean() poolHeated?: boolean;
  @IsOptional() @IsBoolean() poolHeatingIncluded?: boolean;
  @IsOptional() @IsInt() @Min(0) poolHeatingFeePerDay?: number;
  @IsOptional() @IsBoolean() poolHasChildPool?: boolean;
  @IsOptional() @IsNumber() @Min(0) poolLengthM?: number;
  @IsOptional() @IsNumber() @Min(0) poolWidthM?: number;
  @IsOptional() @IsNumber() @Min(0) poolDepthM?: number;

  @IsOptional() @IsInt() @Min(0) wifiMbps?: number;
  @IsOptional() @IsInt() @Min(0) beachDistanceM?: number;
  @IsOptional() @IsBoolean() nearCenter?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) viewTags?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) amenities?: string[];

  @IsOptional() @IsInt() @Min(0) pricePerNight?: number;
  @IsOptional() @IsIn(CURRENCIES) currency?: string;
  @IsOptional() @IsInt() @Min(1) @Max(90) minNights?: number;
  @IsOptional() @IsInt() @Min(0) cleaningFee?: number;
  @IsOptional() @IsInt() @Min(1) @Max(90) cleaningFeeThresholdNights?: number;
  @IsOptional() @IsInt() @Min(0) depositAmount?: number;
  @IsOptional() @IsBoolean() utilitiesIncluded?: boolean;
  @IsOptional() @IsBoolean() gasIncluded?: boolean;
  @IsOptional() @IsInt() @Min(0) extraCleaningFee?: number;

  @IsOptional() @IsIn(PET_POLICIES) petPolicy?: string;
  @IsOptional() @IsString() @Length(0, 500) petNote?: string;
  @IsOptional() @IsBoolean() familiesOnly?: boolean;
  @IsOptional() @IsBoolean() allowSingleMaleGroups?: boolean;
  @IsOptional() @IsBoolean() allowYoungGroups?: boolean;
  @IsOptional() @IsBoolean() eventsAllowed?: boolean;
  @IsOptional() @IsBoolean() smokingAllowed?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) customRules?: string[];
  @IsOptional() @Matches(TIME_RE, { message: 'Saat SS:DD biçiminde olmalı.' }) checkInTime?: string;
  @IsOptional() @Matches(TIME_RE, { message: 'Saat SS:DD biçiminde olmalı.' }) checkOutTime?: string;
  @IsOptional() @IsInt() @Min(0) @Max(6) checkInWeekday?: number;

  @IsOptional() @IsString() @Length(0, 500) videoUrl?: string;

  /** Yalnızca admin uygulanır — host-villas.controller.ts bu alanı düşürür. */
  @IsOptional() @IsNumber() @Min(0) @Max(100) commissionRate?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) conceptIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RoomDto)
  rooms?: RoomDto[];
}

const REQUIRED_FOR_CREATE: (keyof VillaInputDto)[] = [
  'title',
  'regionId',
  'buildingType',
  'maxAdults',
  'bedrooms',
  'bathrooms',
  'pricePerNight',
];

export function assertCreateRequired(dto: VillaInputDto) {
  const missing = REQUIRED_FOR_CREATE.filter((k) => dto[k] === undefined || dto[k] === '');
  if (missing.length) {
    throw new BadRequestException(`Eksik alan: ${missing.join(', ')}`);
  }
}

export class PriceRuleDto {
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsInt() @Min(0) pricePerNight!: number;
  @IsOptional() @IsInt() @Min(1) @Max(90) minNights?: number;
}

export class BlockedDateDto {
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsString() @Length(0, 300) note?: string;
}

export class ImageReorderDto {
  @IsOptional() @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() isCover?: boolean;
}

export class ReviewVillaDto {
  @IsIn(['PUBLISHED', 'REJECTED']) status!: 'PUBLISHED' | 'REJECTED';
  @IsOptional() @IsString() @Length(0, 2000) reviewNote?: string;
}
