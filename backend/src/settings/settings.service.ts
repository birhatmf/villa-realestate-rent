import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Kayıt yoksa boş obje — çağıran taraf her zaman bir obje görür. */
  async get(key: string): Promise<Record<string, any>> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return (row?.value as Record<string, any>) ?? {};
  }

  async set(key: string, value: Prisma.InputJsonValue) {
    const row = await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return row.value;
  }
}
