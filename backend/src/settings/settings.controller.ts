import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';

class SetSettingDto {
  @IsObject() value!: Record<string, any>;
}

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }
}

@Controller('admin/settings')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSettingsController {
  constructor(private settings: SettingsService) {}

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() dto: SetSettingDto) {
    return this.settings.set(key, dto.value);
  }
}
