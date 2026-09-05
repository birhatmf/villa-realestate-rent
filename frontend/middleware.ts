import { NextResponse, type NextRequest } from 'next/server';
import { decodeSession, TOKEN_COOKIE, USER_COOKIE } from '@/lib/session';

/**
 * Yalnızca yönlendirme içindir. `mv_user` çerezi kullanıcı tarafından
 * düzenlenebilir — asıl yetki her zaman backend'de RolesGuard ile verilir.
 * Rolü kurcalayan biri en fazla boş bir admin kabuğu görür, her API çağrısı 403 döner.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasToken = req.cookies.has(TOKEN_COOKIE);
  const session = decodeSession(req.cookies.get(USER_COOKIE)?.value);

  const redirect = (to: string) => NextResponse.redirect(new URL(to, req.url));

  // Girişliyken giriş/kayıt ekranlarında oyalanma.
  if (pathname === '/giris' || pathname === '/kayit') {
    return hasToken ? redirect('/hesabim') : NextResponse.next();
  }

  if (pathname === '/admin/login') {
    if (!hasToken) return NextResponse.next();
    return redirect(session?.role === 'ADMIN' ? '/admin' : '/');
  }

  if (pathname === '/hesabim' || pathname.startsWith('/hesabim/')) {
    if (!hasToken) {
      const url = new URL('/giris', req.url);
      url.searchParams.set('next', pathname + search);
      return NextResponse.redirect(url);
    }
    // "Villalarım" yalnızca HOST/ADMIN — misafir üye önce ev sahibi başvurusu yapmalı.
    if (pathname.startsWith('/hesabim/villalarim') && session && session.role === 'GUEST') {
      return redirect('/hesabim');
    }
    return NextResponse.next();
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!hasToken) {
      const url = new URL('/admin/login', req.url);
      url.searchParams.set('next', pathname + search);
      return NextResponse.redirect(url);
    }
    // Girişli ama yönetici değil: admin login'e yollamak kafa karıştırır.
    if (session && session.role !== 'ADMIN') return redirect('/');
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/hesabim/:path*', '/giris', '/kayit'] };
