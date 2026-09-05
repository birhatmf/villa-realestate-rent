'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteUser,
  listUsers,
  updateUser,
  type AdminUser,
  type UserListResult,
} from '@/lib/adminApi';

const ROLE_LABEL: Record<string, string> = { GUEST: 'Misafir', HOST: 'Ev sahibi', ADMIN: 'Yönetici' };
const ROLE_CLS: Record<string, string> = {
  ADMIN: 'bg-gold/15 text-gold',
  HOST: 'bg-olive/15 text-olive',
  GUEST: 'bg-sand-deep/70 text-muted',
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function UsersTable() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await listUsers({ q, role, active, page, pageSize: 20 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Üyeler yüklenemedi.');
    }
  }, [q, role, active, page]);

  // Arama yazarken her tuşta istek atmasın (PageEditor'daki öngösterim ile aynı desen).
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Filtre değişince ilk sayfaya dön.
  useEffect(() => setPage(1), [q, role, active]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-6 py-3">
        <h1 className="font-display text-lg font-light text-ink">
          Üyeler
          {data && <span className="ml-2.5 text-[0.85rem] text-muted">{data.total}</span>}
        </h1>
        {error && <span className="text-[0.8rem] text-red-700">{error}</span>}
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-6 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ad, e‑posta veya telefon ara"
          className="w-72 rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-olive-soft"
        />
        <Select value={role} onChange={setRole} options={[['', 'Tüm roller'], ['GUEST', 'Misafir'], ['HOST', 'Ev sahibi'], ['ADMIN', 'Yönetici']]} />
        <Select value={active} onChange={setActive} options={[['', 'Tüm durumlar'], ['true', 'Aktif'], ['false', 'Engelli']]} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-canvas">
            <tr className="border-b border-line">
              {['Üye', 'Telefon', 'Rol', 'Durum', 'Kayıt'].map((h) => (
                <th key={h} className="eyebrow px-6 py-3 font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr
                key={u.id}
                onClick={() => setSelected(u)}
                className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-sand/50 ${
                  selected?.id === u.id ? 'bg-sand/70' : ''
                }`}
              >
                <td className="px-6 py-3.5">
                  <p className={`text-[0.92rem] ${u.active ? 'text-ink' : 'text-muted line-through'}`}>
                    {u.name}
                  </p>
                  <p className="text-[0.8rem] text-muted">{u.email}</p>
                </td>
                <td className="px-6 py-3.5 text-[0.86rem] text-muted">{u.phone || '—'}</td>
                <td className="px-6 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-[0.72rem] ${ROLE_CLS[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-[0.86rem]">
                  {u.active ? (
                    <span className="text-muted">Aktif</span>
                  ) : (
                    <span className="text-red-700">Engelli</span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-[0.86rem] text-muted">{fmt(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.items.length === 0 && (
          <p className="px-6 py-12 text-center text-[0.9rem] text-muted">
            Bu filtreye uyan üye yok.
          </p>
        )}
        {data === null && !error && (
          <p className="px-6 py-12 text-center text-[0.9rem] text-muted">Yükleniyor…</p>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-line px-6 py-3 text-[0.85rem] text-muted">
          <span>
            Sayfa {data.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Önceki
            </PageBtn>
            <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Sonraki →
            </PageBtn>
          </div>
        </div>
      )}

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function UserDrawer({
  user,
  onClose,
  onChanged,
}: {
  user: AdminUser;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dirty = role !== user.role || active !== user.active;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateUser(user.id, { role, active });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`${user.name} kalıcı olarak silinsin mi? Geri alınamaz.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteUser(user.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-ink/25" onClick={onClose} />
      <div className="flex w-[380px] flex-col border-l border-line bg-canvas">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="truncate font-display text-lg font-light text-ink">{user.name}</h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="text-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <dl className="space-y-3.5">
            <Detail label="E‑posta" value={user.email} />
            <Detail label="Telefon" value={user.phone || '—'} />
            <Detail label="Kayıt tarihi" value={fmt(user.createdAt)} />
            <Detail label="Son giriş" value={fmt(user.lastLoginAt)} />
            <Detail label="KVKK onayı" value={fmt(user.kvkkAcceptedAt)} />
            <Detail label="Bülten izni" value={user.marketingOptIn ? 'Var' : 'Yok'} />
          </dl>

          <label className="block">
            <span className="eyebrow text-muted">Rol</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUser['role'])}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-olive-soft"
            >
              <option value="GUEST">Misafir</option>
              <option value="HOST">Ev sahibi</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-olive"
            />
            <span className="text-[0.88rem] text-ink">Hesap aktif</span>
          </label>

          {error && (
            <p role="alert" className="border-l-2 border-red-400 pl-3 text-[0.85rem] text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3">
          <button
            onClick={remove}
            disabled={busy}
            className="text-[0.85rem] text-muted transition-colors hover:text-red-700 disabled:opacity-40"
          >
            Sil
          </button>
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="rounded-full bg-ink px-5 py-2 text-[0.85rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
          >
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="eyebrow shrink-0 text-muted">{label}</dt>
      <dd className="truncate text-[0.88rem] text-ink">{value}</dd>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-line bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors focus:border-olive-soft"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-line px-3 py-1.5 transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
