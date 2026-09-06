import { Controller, Delete, Get, Headers, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { BookingsService } from './bookings.service';
import { CreateHoldDto } from './dto';

type AuthRequest = Request & { user: { sub: string } };

@Controller('bookings')
@UseGuards(JwtGuard, RolesGuard, ThrottlerGuard)
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Post('holds')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createHold(
    @Body() dto: CreateHoldDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthRequest,
  ) {
    return this.bookings.createHold(dto, req.user.sub, idempotencyKey);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.bookings.getOwn(id, req.user.sub);
  }

  @Delete(':id/hold')
  releaseHold(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.bookings.releaseOwnHold(id, req.user.sub);
  }
}
