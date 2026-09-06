import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { BookingStatus } from '@prisma/client';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { BookingsService } from './bookings.service';
import {
  AdminCreateBookingDto,
  BookingListDto,
  BookingVersionDto,
  CancelBookingDto,
  ChangeBookingDto,
} from './dto';

type AuthRequest = Request & { user: { sub: string } };

@Controller('admin/bookings')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBookingsController {
  constructor(private bookings: BookingsService) {}

  @Get()
  list(@Query() query: BookingListDto) {
    return this.bookings.listAdmin({ ...query, status: query.status as BookingStatus | undefined });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.bookings.getAdmin(id);
  }

  @Post()
  create(
    @Body() dto: AdminCreateBookingDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthRequest,
  ) {
    return this.bookings.createConfirmed(dto, req.user.sub, idempotencyKey);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: BookingVersionDto, @Req() req: AuthRequest) {
    return this.bookings.confirm(id, dto.version, req.user.sub);
  }

  @Patch(':id')
  change(@Param('id') id: string, @Body() dto: ChangeBookingDto, @Req() req: AuthRequest) {
    return this.bookings.change(id, dto, req.user.sub);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelBookingDto, @Req() req: AuthRequest) {
    return this.bookings.cancel(id, dto.version, dto.note, req.user.sub);
  }
}
