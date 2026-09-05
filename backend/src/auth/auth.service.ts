import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

const SAFE_USER = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  marketingOptIn?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private sign(user: { id: string; email: string; role: string }) {
    return this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
  }

  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('Bu e‑posta adresi zaten kayıtlı.');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: 'GUEST',
        kvkkAcceptedAt: new Date(),
        marketingOptIn: input.marketingOptIn ?? false,
        lastLoginAt: new Date(),
      },
      select: SAFE_USER,
    });

    return { token: await this.sign(user), user };
  }

  async login(rawEmail: string, password: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Kullanıcı yoksa da hash karşılaştırması yapıyoruz ki yanıt süresi
    // e‑postanın kayıtlı olup olmadığını sızdırmasın.
    const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) throw new UnauthorizedException('E‑posta veya şifre hatalı.');
    if (!user.active) throw new UnauthorizedException('Hesabınız devre dışı bırakılmış.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // register/me ile aynı alan kümesi dönsün diye elle seçiyoruz.
    const { id, email: mail, name, phone, role, active, createdAt } = user;
    return {
      token: await this.sign(user),
      user: { id, email: mail, name, phone, role, active, createdAt },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER,
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
