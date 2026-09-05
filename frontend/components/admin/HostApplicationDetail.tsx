'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getHostApplication,
  hostApplicationDownloadUrl,
  reviewHostApplication,
  type HostApplicationDetail as Detail,
} from '@/lib/adminApi';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Beklemede', APPROVED: 'Onaylandı', REJECTED: 'Reddedildi' };
const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-gold/15 text-gold',
  APPROVED: 'bg-olive/15 text-olive',
  REJECTED: 'bg-red-100 text-red-700',
};
const OWNERSHIP_LABEL: Record<string, string> = { SOLE: 'Müstakil Tapu', SHARED: 'Hisseli Tapu', SITE: 'Site / Rezidans İçi' };
const DOC_LABEL: Record<string, string> = {
  PERMIT_CERTIFICATE: 'Bakanlık İzin Belgesi',
  PLAQUE_PHOTO: 'Bakanlık Plaketi Fotoğrafı',
  TITLE_DEED: 'Tapu Kaydı',
  ID_DOCUMENT: 'Kimlik Belgesi',
  FIRE_SAFETY_DECLARATION: 'Yangın / Güvenlik Beyanı',
  POWER_OF_ATTORNEY: 'Vekaletname',
  CONSENT_LETTER: 'Hissedar Muvafakatnamesi',
  MANAGEMENT_DECISION: 'Site Yönetim Kararı',
  OTHER: 'Diğer belge',
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function HostApplicationDetail({ id }: { id: string }) {
  const [app, setApp] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    getHostApplication(id)
      .then((a) => {
        setApp(a);
        setNote(a.adminNote ?? '');
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function review(status: 'APPROVED' | 'REJECTED') {
    if (status === 'REJECTED' && !confirm('Bu başvuru reddedilsin mi?')) return;
    setBusy(true);
    setError(null);
    try {
      await reviewHostApplication(id, { status, adminNote: note || undefined });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !app) return <Centered>{error}</Centered>;
  if (!app) return <Centered>Yükleniyor…</Centered>;

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-6 border-b border-line bg-surface px-6 py-3.5">
        <div className="flex items-center gap-4">
          <Link href="/admin/ev-sahipleri" className="text-[0.85rem] text-muted transition-colors hover:text-ink">
            ← Başvurular
          </Link>
          <span className="h-4 w-px bg-line" />
          <h1 className="font-display text-lg font-light text-ink">{app.ownerName}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[0.72rem] ${STATUS_CLS[app.status]}`}>
            {STATUS_LABEL[app.status]}
          </span>
        </div>
        {error && <span className="text-[0.8rem] text-red-700">{error}</span>}
      </header>

      <div className="mx-auto max-w-3xl px-8 py-10">
        <Section title="1. Villa Sahibi / Yetkili Bilgileri">
          <Grid>
            <Item label="Adı Soyadı / Şirket Unvanı" value={app.ownerName} />
            <Item label="T.C. Kimlik / Pasaport / Vergi No" value={app.ownerIdNumber} />
            <Item label="Telefon" value={app.phone} />
            <Item label="E‑posta" value={app.email} />
            <Item label="UETS Adresi" value={app.uetsAddress || '—'} />
            <Item label="IBAN" value={app.iban} mono />
          </Grid>
        </Section>

        <Section title="2. Mülk ve İzin Bilgileri">
          <Grid>
            <Item label="Adres" value={app.address} full />
            <Item label="Ada / Parsel No" value={app.parcelNo || '—'} />
            <Item label="Bakanlık İzin Belge No" value={app.permitNumber || '—'} />
            <Item label="Azami Kişi Kapasitesi" value={app.maxCapacity ? `${app.maxCapacity} kişi` : '—'} />
            <Item label="KBS Tesis Kodu" value={app.kbsCode || '—'} />
            <Item label="Mülkiyet Tipi" value={OWNERSHIP_LABEL[app.ownershipType]} />
          </Grid>
        </Section>

        <Section title="3. Belgeler">
          {app.documents.length === 0 ? (
            <p className="text-[0.88rem] text-muted">Henüz belge yüklenmemiş.</p>
          ) : (
            <div className="divide-y divide-line border-y border-line">
              {app.documents.map((d) => (
                <a
                  key={d.id}
                  href={hostApplicationDownloadUrl(id, d.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-sand/40"
                >
                  <div className="min-w-0">
                    <p className="text-[0.9rem] text-ink">{DOC_LABEL[d.type] ?? d.type}</p>
                    <p className="truncate text-[0.78rem] text-muted">{d.fileName} · {fmtSize(d.size)}</p>
                  </div>
                  <span className="shrink-0 text-[0.82rem] text-ink underline underline-offset-4">
                    Görüntüle ↗
                  </span>
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title="4. Taahhüt ve Onay">
          <Grid>
            <Item label="İmza" value={app.signatureName} />
            <Item label="Onay Tarihi" value={fmtDate(app.termsAcceptedAt)} />
          </Grid>
        </Section>

        <Section title="İnceleme">
          <Grid>
            <Item label="İnceleme Tarihi" value={fmtDate(app.reviewedAt)} />
            <Item label="Başvuru Tarihi" value={fmtDate(app.createdAt)} />
          </Grid>

          <label className="mt-6 block">
            <span className="eyebrow text-muted">Yönetici notu</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Onay veya red gerekçesi (isteğe bağlı)"
              className="mt-1.5 w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-olive-soft"
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => review('APPROVED')}
              disabled={busy || app.status === 'APPROVED'}
              className="rounded-full bg-ink px-6 py-2.5 text-[0.88rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
            >
              Onayla
            </button>
            <button
              onClick={() => review('REJECTED')}
              disabled={busy || app.status === 'REJECTED'}
              className="rounded-full border border-red-300 px-6 py-2.5 text-[0.88rem] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-35"
            >
              Reddet
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="eyebrow text-gold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{children}</div>
);

function Item({ label, value, full, mono }: { label: string; value: string; full?: boolean; mono?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-[0.78rem] text-muted">{label}</p>
      <p className={`mt-0.5 text-[0.94rem] text-ink ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full items-center justify-center text-[0.9rem] text-muted">{children}</div>
);
