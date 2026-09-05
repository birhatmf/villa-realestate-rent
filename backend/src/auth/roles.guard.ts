import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * JwtGuard'dan SONRA çalışır (@UseGuards(JwtGuard, RolesGuard) sırası korunur).
 *
 * Rolü token'dan değil veritabanından okur: rol değişikliği ve hesap engelleme
 * token'ın 7 günlük ömrünü beklemeden anında etkili olsun diye. Tek indeksli sorgu.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest<{ user?: { sub?: string; role?: Role } }>();
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException('Oturum bulunamadı.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user) throw new UnauthorizedException('Hesap bulunamadı.');
    if (!user.active) throw new ForbiddenException('Hesabınız devre dışı bırakılmış.');
    if (required?.length && !required.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    }

    req.user!.role = user.role;
    return true;
  }
}
