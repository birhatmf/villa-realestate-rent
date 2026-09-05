'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { login } from '@/lib/authApi';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(params.get('next') || '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <p className="font-display text-2xl leading-none tracking-tight text-ink">
            villa<span className="text-gold">sepeti</span>
          </p>
          <h1 className="mt-10 font-display text-4xl font-light leading-tight tracking-[-0.02em] text-ink">
            Yönetim paneli
          </h1>
          <p className="mt-3 text-[0.95rem] text-muted">Devam etmek için giriş yapın.</p>

          <div className="mt-10 space-y-6">
            <label className="block">
              <span className="eyebrow text-muted">E‑posta</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border-b border-ink/25 bg-transparent pb-2 text-[0.98rem] text-ink outline-none transition-colors focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="eyebrow text-muted">Şifre</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border-b border-ink/25 bg-transparent pb-2 text-[0.98rem] text-ink outline-none transition-colors focus:border-ink"
              />
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
            className="mt-10 w-full rounded-full bg-ink py-3.5 text-[0.92rem] text-canvas transition-colors hover:bg-olive disabled:opacity-50"
          >
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>
      </div>

      <div className="relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1400&q=80"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/25" />
      </div>
    </div>
  );
}
