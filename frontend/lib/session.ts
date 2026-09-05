/**
 * `mv_user` çerezi — backend'in base64url ile yazdığı {name, role}.
 *
 * SADECE arayüz ve yönlendirme içindir: kullanıcı tarafından düzenlenebilir,
 * asla yetki kaynağı değildir. Gerçek yetki backend'de RolesGuard ile verilir.
 * Hem tarayıcıda hem Edge middleware'de çalışır.
 */
export type SessionUser = { name: string; role: 'GUEST' | 'HOST' | 'ADMIN' };

export const USER_COOKIE = 'mv_user';
export const TOKEN_COOKIE = 'mv_token';

export function decodeSession(value?: string | null): SessionUser | null {
  if (!value) return null;
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed?.name && parsed?.role ? parsed : null;
  } catch {
    return null;
  }
}

/** Tarayıcıda mevcut oturumu okur. */
export function readSession(): SessionUser | null {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${USER_COOKIE}=`));
  return decodeSession(hit?.slice(USER_COOKIE.length + 1));
}
