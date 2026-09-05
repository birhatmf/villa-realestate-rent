import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export const TOKEN_COOKIE = 'mv_token';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: any }>();
    const bearer = req.headers.authorization?.replace(/^Bearer /i, '');
    const token = req.cookies?.[TOKEN_COOKIE] ?? bearer;
    if (!token) throw new UnauthorizedException('Oturum bulunamadı.');

    try {
      req.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Oturum süresi doldu.');
    }
  }
}
