import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CalendarService } from './calendar.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class CalendarQueryDto {
  @IsString() @Matches(DATE_RE) from!: string;
  @IsString() @Matches(DATE_RE) to!: string;
  @IsOptional() @IsString() villaId?: string;
  @IsOptional() @IsString() regionId?: string;
}

class AuditQueryDto {
  @IsOptional() @IsString() villaId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit?: number;
}

type AuthRequest = Request & { user: { sub: string } };

@Controller('admin/calendar')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCalendarController {
  constructor(private calendar: CalendarService) {}

  @Get()
  range(@Query() query: CalendarQueryDto) {
    return this.calendar.range(query);
  }

  @Get('audit')
  audit(@Query() query: AuditQueryDto) {
    return this.calendar.audit(query.villaId, query.limit);
  }
}

@Controller('host/calendar')
@UseGuards(JwtGuard, RolesGuard)
@Roles('HOST', 'ADMIN')
export class HostCalendarController {
  constructor(private calendar: CalendarService) {}

  @Get()
  range(@Query() query: CalendarQueryDto, @Req() req: AuthRequest) {
    return this.calendar.range(query, req.user.sub);
  }

  @Get('audit')
  audit(@Query() query: AuditQueryDto, @Req() req: AuthRequest) {
    return this.calendar.audit(query.villaId, query.limit, req.user.sub);
  }
}
