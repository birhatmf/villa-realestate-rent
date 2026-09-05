import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

/** passwordHash hiçbir yanıtta dönmesin diye tek yerden seçiyoruz. */
const SAFE = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  active: true,
  marketingOptIn: true,
  kvkkAcceptedAt: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export type ListParams = {
  q?: string;
  role?: Role;
  active?: boolean;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list({ q, role, active, page = 1, pageSize = 20 }: ListParams) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(active === undefined ? {} : { active }),
      ...(q?.trim()
        ? {
            OR: [
              { name: { contains: q.trim(), mode: 'insensitive' } },
              { email: { contains: q.trim(), mode: 'insensitive' } },
              { phone: { contains: q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: Math.max(page, 1), pageSize: take };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE });
    if (!user) throw new NotFoundException('Üye bulunamadı.');
    return user;
  }

  async update(id: string, data: { role?: Role; active?: boolean }, actorId: string) {
    await this.get(id);
    // Kilitlenme koruması: yönetici kendi yetkisini düşüremez / kendini engelleyemez.
    if (id === actorId) {
      if (data.role && data.role !== 'ADMIN') {
        throw new BadRequestException('Kendi yönetici yetkinizi kaldıramazsınız.');
      }
      if (data.active === false) {
        throw new BadRequestException('Kendi hesabınızı engelleyemezsiniz.');
      }
    }
    return this.prisma.user.update({ where: { id }, data, select: SAFE });
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException('Kendi hesabınızı silemezsiniz.');
    await this.get(id);
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  counts() {
    return this.prisma.user.count();
  }
}
