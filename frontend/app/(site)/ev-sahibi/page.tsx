'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  createHostApplication,
  uploadHostApplicationDocument,
  type CreateApplicationInput,
  type DocumentType,
  type OwnershipType,
} from '@/lib/hostApplicationApi';
import { DOCUMENT_SLOTS, isRequired } from '@/lib/hostDocuments';

const fieldCls =
  'mt-1.5 w-full border-b border-ink/25 bg-transparent pb-2 text-[0.96rem] text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-ink';

const IBAN_RE = /^TR[0-9]{24}$/;

type FormState = Omit<CreateApplicationInput, 'maxCapacity'> & { maxCapacity: string };

const EMPTY: FormState = {
  ownerName: '',
  ownerIdNumber: '',
  phone: '',
  email: '',
  uetsAddress: '',
  iban: 'TR',
  address: '',
  parcelNo: '',
  permitNumber: '',
  maxCapacity: '',
  kbsCode: '',
  ownershipType: 'SOLE',
  signatureName: '',
};

export default function EvSahibiPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; partial: boolean } | null>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const missingRequired = useMemo(
    () =>
      DOCUMENT_SLOTS.filter((s) => isRequired(s, form.ownershipType) && !files[s.type]).map(
        (s) => s.label,
      ),
    [files, form.ownershipType],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!IBAN_RE.test(form.iban.replace(/\s/g, '').toUpperCase())) {
      setError('IBAN, TR ile başlamalı ve toplam 26 karakter olmalı.');
      return;
    }
    if (!accepted) {
      setError('Devam etmek için taahhüt metnini onaylamalısınız.');
      return;
    }
    if (missingRequired.length) {
      setError(`Eksik belge: ${missingRequired.join(', ')}`);
      return;
    }

    setBusy(true);
    try {
      const { id } = await createHostApplication({
        ...form,
        iban: form.iban.replace(/\s/g, '').toUpperCase(),
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
        uetsAddress: form.uetsAddress || undefined,
        parcelNo: form.parcelNo || undefined,
        permitNumber: form.permitNumber || undefined,
        kbsCode: form.kbsCode || undefined,
      });

      let partial = false;
      for (const [type, file] of Object.entries(files) as [DocumentType, File][]) {
        try {
          await uploadHostApplicationDocument(id, type, file);
        } catch {
          partial = true;
        }
      }

      setResult({ id, partial });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvuru gönderilemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (result) return <SuccessScreen id={result.id} partial={result.partial} />;

  return (
    <div className="pb-28 pt-32">
      <div className="relative flex min-h-[42vh] items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-canvas" />
        <div className="relative mx-auto w-full max-w-3xl px-6 pb-14 lg:px-10">
          <p className="eyebrow text-white/70">Ev sahipleri için</p>
          <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-light leading-[1.08] tracking-[-0.02em] text-white">
            Villa Kayıt ve Ön Başvuru Formu
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-white/80">
            Villanızı portföyümüze eklemek için aşağıdaki bilgileri ve belgeleri iletin. Başvurunuzu
            inceleyip en kısa sürede size dönüş yapacağız.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mx-auto max-w-3xl px-6 pt-16 lg:px-10">
        <Section n="1" title="Villa Sahibi / Yetkili Bilgileri">
          <Field label="Adı Soyadı / Şirket Unvanı" required>
            <input required value={form.ownerName} onChange={set('ownerName')} className={fieldCls} />
          </Field>
          <Field label="T.C. Kimlik / Pasaport / Vergi No" required>
            <input required value={form.ownerIdNumber} onChange={set('ownerIdNumber')} className={fieldCls} />
          </Field>
          <Row>
            <Field label="Telefon" required>
              <input
                type="tel"
                required
                placeholder="0555 000 00 00"
                value={form.phone}
                onChange={set('phone')}
                className={fieldCls}
              />
            </Field>
            <Field label="E‑posta" required>
              <input type="email" required value={form.email} onChange={set('email')} className={fieldCls} />
            </Field>
          </Row>
          <Field label="UETS (Elektronik Tebligat) Adresi">
            <input value={form.uetsAddress} onChange={set('uetsAddress')} className={fieldCls} />
          </Field>
          <Field label="Ödeme Yapılacak IBAN" hint="Tapu sahibiyle aynı olmalıdır." required>
            <input
              required
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value.toUpperCase() }))}
              placeholder="TR.................................."
              className={`${fieldCls} font-mono tracking-wide`}
            />
          </Field>
        </Section>

        <Section n="2" title="Mülk ve İzin Bilgileri">
          <Field label="Villanın Adresi (UAVT / Açık Adres)" required>
            <textarea
              required
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={`${fieldCls} resize-y`}
            />
          </Field>
          <Field label="Ada / Parsel No">
            <input value={form.parcelNo} onChange={set('parcelNo')} className={fieldCls} />
          </Field>
          <Field label="Kültür ve Turizm Bakanlığı İzin Belge No">
            <input value={form.permitNumber} onChange={set('permitNumber')} className={fieldCls} />
          </Field>
          <Row>
            <Field label="Bakanlıkça Onaylanan Azami Kişi Kapasitesi">
              <input
                type="number"
                min={1}
                value={form.maxCapacity}
                onChange={set('maxCapacity')}
                className={fieldCls}
              />
            </Field>
            <Field label="KBS (Kimlik Bildirim Sistemi) Tesis Kodu">
              <input value={form.kbsCode} onChange={set('kbsCode')} className={fieldCls} />
            </Field>
          </Row>

          <div>
            <span className="eyebrow text-muted">Mülkiyet Tipi</span>
            <div className="mt-3 space-y-2.5">
              {(
                [
                  ['SOLE', 'Müstakil Tapu'],
                  ['SHARED', 'Hisseli Tapu (Hissedar muvafakatnamesi eklenmelidir)'],
                  ['SITE', 'Site / Rezidans İçi (Yönetim kararı eklenmelidir)'],
                ] as [OwnershipType, string][]
              ).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="ownershipType"
                    checked={form.ownershipType === value}
                    onChange={() => setForm((f) => ({ ...f, ownershipType: value }))}
                    className="h-4 w-4 accent-olive"
                  />
                  <span className="text-[0.92rem] text-ink-soft">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section n="3" title="Yüklenecek Belgeler">
          <p className="text-[0.88rem] text-muted">
            Lütfen aşağıdaki belgeleri eksiksiz yükleyin. PDF, JPG veya PNG — her dosya en fazla 10 MB.
          </p>
          <div className="space-y-3">
            {DOCUMENT_SLOTS.map((slot) => {
              const required = isRequired(slot, form.ownershipType);
              const file = files[slot.type];
              return (
                <label
                  key={slot.type}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
                    file ? 'border-olive-soft bg-olive/5' : 'border-line bg-surface hover:border-ink/25'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setFiles((prev) => (f ? { ...prev, [slot.type]: f } : prev));
                    }}
                  />
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.7rem] ${
                      file ? 'border-olive bg-olive text-canvas' : 'border-ink/30 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9rem] text-ink">
                      {slot.label}
                      {required && <span className="text-gold"> *</span>}
                    </span>
                    {slot.hint && <span className="mt-0.5 block text-[0.78rem] text-muted">{slot.hint}</span>}
                    {file && (
                      <span className="mt-1 block truncate text-[0.78rem] text-olive">{file.name}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        <Section n="4" title="Taahhüt ve Onay">
          <div className="rounded-xl border border-line bg-sand/40 px-5 py-5 text-[0.88rem] leading-relaxed text-ink-soft">
            Yukarıda beyan ettiğim tüm bilgilerin doğruluğunu; 7464 sayılı Kanun kapsamında Kültür ve
            Turizm Bakanlığı izin belgesinin faal olduğunu; konaklayacak kişilerin KBS sistemine
            bildirilmesinden yasal olarak sorumlu olduğumu kabul ederim. İzin belgesinin iptali, eksik
            beyan veya mevzuata aykırılıktan doğabilecek tüm idari ve mali sorumluluk tarafıma aittir.
            Firmanızın portföyünde villamın pazarlanmasına ve aracı olunmasına onay veriyorum.
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
            />
            <span className="text-[0.9rem] text-ink-soft">
              Yukarıdaki taahhüt metnini okudum, kabul ediyorum.
            </span>
          </label>

          <Field label="İsim / İmza" hint="Adınızı yazarak imzalamış sayılırsınız." required>
            <input
              required
              value={form.signatureName}
              onChange={set('signatureName')}
              className={fieldCls}
            />
          </Field>
        </Section>

        {error && (
          <p role="alert" className="mt-8 border-l-2 border-red-400 pl-3 text-[0.88rem] text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-10 w-full rounded-full bg-ink py-4 text-[0.95rem] text-canvas transition-colors hover:bg-olive disabled:opacity-50 sm:w-auto sm:px-14"
        >
          {busy ? 'Gönderiliyor…' : 'Başvuruyu gönder'}
        </button>
      </form>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16 first:mt-0">
      <div className="flex items-baseline gap-3 border-b border-line pb-4">
        <span className="font-display text-lg text-gold">{n}</span>
        <h2 className="font-display text-2xl font-light tracking-[-0.01em] text-ink">{title}</h2>
      </div>
      <div className="mt-7 space-y-7">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-muted">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[0.78rem] text-muted/80">{hint}</span>}
    </label>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-7 sm:grid-cols-2">{children}</div>
);

function SuccessScreen({ id, partial }: { id: string; partial: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-20">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive/10 text-2xl text-olive">
          ✓
        </span>
        <h1 className="mt-6 font-display text-3xl font-light tracking-[-0.02em] text-ink">
          Başvurunuz alındı
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">
          Başvuru numaranız <span className="font-mono text-ink">{id.slice(-8).toUpperCase()}</span>.
          Ekibimiz belgelerinizi inceleyip size e‑posta veya telefonla dönüş yapacak.
        </p>
        {partial && (
          <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-[0.85rem] text-ink-soft">
            Bazı belgeler yüklenirken bir sorun oluştu. Başvurunuz kaydedildi; ekibimiz eksik belgeleri
            sizden ayrıca isteyecek.
          </p>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-ink/20 px-8 py-3 text-[0.9rem] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-canvas"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
