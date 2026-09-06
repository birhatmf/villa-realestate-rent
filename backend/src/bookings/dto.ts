import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class StayDto {
  @IsString() @Matches(DATE_RE) from!: string;
  @IsString() @Matches(DATE_RE) to!: string;
  @IsInt() @Min(1) @Max(20) adults!: number;
  @IsOptional() @IsInt() @Min(0) @Max(12) children?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) infants?: number;
}

export class CreateHoldDto extends StayDto {
  @IsString() villaId!: string;
}

export class AdminCreateBookingDto extends StayDto {
  @IsString() villaId!: string;
  @IsOptional() @IsString() guestId?: string;
  @IsOptional() @IsString() @Length(2, 100) customerName?: string;
  @IsOptional() @IsEmail() customerEmail?: string;
  @IsOptional() @IsString() @Length(5, 30) customerPhone?: string;
}

export class ChangeBookingDto extends StayDto {
  @IsInt() @Min(0) version!: number;
}

export class BookingVersionDto {
  @IsInt() @Min(0) version!: number;
}

export class CancelBookingDto extends BookingVersionDto {
  @IsString() @Length(2, 300) note!: string;
}

const BOOKING_STATUSES = ['HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED'] as const;

export class BookingListDto {
  @IsOptional() @IsIn(BOOKING_STATUSES) status?: (typeof BOOKING_STATUSES)[number];
  @IsOptional() @IsString() villaId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
