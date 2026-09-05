'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AuthShell, { AuthLink, fieldCls } from '@/components/site/AuthShell';
import { register } from '@/lib/authApi';

export default function KayitPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [kvkk, setKvkk] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, kvkkAccepted: kvkk, marketingOptIn: marketing });
      router.replace('/hesabim');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt oluşturulamadı.');
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Üyelik"
      title="Aramıza katılın"
      subtitle="Üyelik ücretsiz. Rezervasyonlarınızı takip edin, beğendiğiniz villaları kaydedin."
      image="https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=80"
      footer={
        <>
          Zaten üye misiniz? <AuthLink href="/giris">Giriş yapın</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-10">
        <div className="space-y-6">
          <label className="block">
            <span className="eyebrow text-muted">Ad soyad</span>
            <input
              required
              autoFocus
              autoComplete="name"
              value={form.name}
              onChange={set('name')}
              className={fieldCls}
            />
          </label>

          <label className="block">
            <span className="eyebrow text-muted">E‑posta</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              className={fieldCls}
            />
          </label>

          <label className="block">
            <span className="eyebrow text-muted">Telefon</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="0555 000 00 00"
              value={form.phone}
              onChange={set('phone')}
              className={`${fieldCls} placeholder:text-muted/60`}
            />
            <span className="mt-1.5 block text-[0.78rem] text-muted/80">
              Rezervasyon sırasında size ulaşabilmemiz için.
            </span>
          </label>

          <label className="block">
            <span className="eyebrow text-muted">Şifre</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              className={fieldCls}
            />
            <span className="mt-1.5 block text-[0.78rem] text-muted/80">En az 8 karakter.</span>
          </label>
        </div>

        <div className="mt-8 space-y-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              required
              checked={kvkk}
              onChange={(e) => setKvkk(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
            />
            <span className="text-[0.88rem] leading-relaxed text-ink-soft">
              <Link href="/kvkk" target="_blank" className="underline underline-offset-2 hover:text-gold">
                KVKK Aydınlatma Metni
              </Link>
              {' ve '}
              <Link href="/gizlilik" target="_blank" className="underline underline-offset-2 hover:text-gold">
                Gizlilik Politikası
              </Link>
              ’nı okudum, kabul ediyorum.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
            />
            <span className="text-[0.88rem] leading-relaxed text-ink-soft">
              Yeni villalardan ve kampanyalardan e‑posta ile haberdar olmak istiyorum.
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-6 border-l-2 border-red-400 pl-3 text-[0.88rem] text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-9 w-full rounded-full bg-ink py-3.5 text-[0.92rem] text-canvas transition-colors hover:bg-olive disabled:opacity-50"
        >
          {busy ? 'Hesap oluşturuluyor…' : 'Üye ol'}
        </button>
      </form>
    </AuthShell>
  );
}
