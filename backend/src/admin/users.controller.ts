import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

const ROLES = ['GUEST', 'HOST', 'ADMIN'] as const;

class ListUsersDto {
  @IsOptional() @IsString() q?: string;

  @IsOptional() @IsIn(ROLES) role?: Role;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === 'true'))
  @IsBoolean()
  active?: boolean;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

class UpdateUserDto {
  @IsOptional() @IsIn(ROLES) role?: Role;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller('admin/users')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.users.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { user: { sub: string } }) {
    return this.users.remove(id, req.user.sub);
  }
}
