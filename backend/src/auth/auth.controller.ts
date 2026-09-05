import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
  Equals,
} from 'class-validator';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard, TOKEN_COOKIE } from './jwt.guard';

/** Okunabilir oturum çerezi — yalnızca arayüz/yönlendirme için. Yetki değil. */
export const USER_COOKIE = 'mv_user';

class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir e‑posta girin.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalı.' })
  password!: string;
}

class RegisterDto {
  @IsString()
  @Length(2, 80, { message: 'Ad soyad en az 2 karakter olmalı.' })
  name!: string;

  @IsEmail({}, { message: 'Geçerli bir e‑posta girin.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalı.' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  @Equals(true, { message: 'Devam etmek için KVKK aydınlatma metnini onaylamalısınız.' })
  kvkkAccepted!: boolean;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

const COOKIE_BASE = {
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

type SessionUser = { name: string; role: string };

function setSession(res: Response, token: string, user: SessionUser) {
  res.cookie(TOKEN_COOKIE, token, { ...COOKIE_BASE, httpOnly: true, maxAge: WEEK });
  // httpOnly DEĞİL: Header'ın adı flashsız göstermesi ve middleware'in rolü
  // JWT çözmeden okuması için. Kullanıcı düzenleyebilir — yetki her zaman
  // backend'de RolesGuard ile verilir, bu çerez güvenlik sınırı değildir.
  res.cookie(
    USER_COOKIE,
    Buffer.from(JSON.stringify({ name: user.name, role: user.role }), 'utf8').toString('base64url'),
    { ...COOKIE_BASE, httpOnly: false, maxAge: WEEK },
  );
}

function clearSession(res: Response) {
  res.clearCookie(TOKEN_COOKIE, { ...COOKIE_BASE, httpOnly: true });
  res.clearCookie(USER_COOKIE, { ...COOKIE_BASE, httpOnly: false });
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.register(dto);
    setSession(res, token, user);
    return user;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    setSession(res, token, user);
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearSession(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  me(@Req() req: Request & { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }
}
