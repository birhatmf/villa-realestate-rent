'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listConcepts, listRegions } from '@/lib/adminApi';
import {
  createVillaApi,
  DEFAULT_VILLA_FORM,
  type VillaApi,
  type VillaBlockedDate,
  type VillaDetail,
  type VillaFormInput,
  type VillaImage,
  type VillaPriceRule,
  type VillaRoom,
} from '@/lib/villaApi';
import {
  AMENITY_SUGGESTIONS,
  BED_TYPE_LABEL,
  BED_TYPES,
  BUILDING_TYPES,
  IMAGE_CATEGORIES,
  IMAGE_CATEGORY_LABEL,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  MIN_PUBLISH_IMAGES,
  PET_POLICIES,
  POOL_TYPES,
  VIEW_TAGS,
  VILLA_STATUS_CLS,
  VILLA_STATUS_LABEL,
  WEEKDAYS,
} from '@/lib/villaSchema';
import { Field, Row, Section, Select, TextArea, TextInput, Toggle } from './formShared';
import type { CalendarEvent } from '@/lib/bookingApi';

type Region = { id: string; slug: string; name: string };

type TabId = 'temel' | 'kapasite' | 'odalar' | 'konsept' | 'fiyat' | 'kurallar' | 'gorseller' | 'fiyatKurallari' | 'takvim';

const TABS: { id: TabId; label: string; editOnly?: boolean }[] = [
  { id: 'temel', label: '1. Temel Bilgiler' },
  { id: 'kapasite', label: '2. Kapasite ve Mekan' },
  { id: 'odalar', label: '3. Oda Kırılımı' },
  { id: 'konsept', label: '4. Konsept ve Nitelikler' },
  { id: 'fiyat', label: '5. Fiyatlandırma' },
  { id: 'kurallar', label: '6. Kurallar' },
  { id: 'gorseller', label: '7. Görseller', editOnly: true },
  { id: 'fiyatKurallari', label: '8. Sezonluk Fiyatlar', editOnly: true },
  { id: 'takvim', label: '9. Takvim', editOnly: true },
];

const BLOCK_KIND_OPTIONS = [
  { value: 'MANUAL', label: 'Satışa kapalı' },
  { value: 'MAINTENANCE', label: 'Bakım' },
  { value: 'OWNER_USE', label: 'Ev sahibi kullanımı' },
] as const;

const BLOCK_KIND_LABEL = Object.fromEntries(BLOCK_KIND_OPTIONS.map((option) => [option.value, option.label]));

export default function VillaForm({
  scope,
  villaId,
  backHref,
}: {
  scope: 'admin' | 'host';
  villaId?: string;
  backHref: string;
}) {
  const router = useRouter();
  const api = useMemo(() => createVillaApi(scope), [scope]);
  const isCreate = !villaId;

  const [regions, setRegions] = useState<Region[]>([]);
  const [concepts, setConcepts] = useState<Region[]>([]);
  const [villa, setVilla] = useState<VillaDetail | null>(null);
  const [form, setForm] = useState<VillaFormInput>(DEFAULT_VILLA_FORM);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<TabId>('temel');

  const priceRange = useMemo(() => {
    if (!form.pricePerNight) return null;
    const prices = [form.pricePerNight, ...(villa?.priceRules.map((r) => r.pricePerNight) ?? [])];
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [form.pricePerNight, villa]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!villaId) return;
    api
      .get(villaId)
      .then((v) => {
        setVilla(v);
        setForm({ ...v, conceptIds: v.concepts.map((c) => c.id) });
        setDirty(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Villa yüklenemedi.'));
  }, [api, villaId]);

  useEffect(() => {
    listRegions().then(setRegions).catch(() => {});
    listConcepts().then(setConcepts).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = useCallback(<K extends keyof VillaFormInput>(key: K, value: VillaFormInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (isCreate) {
        const created = await api.create(form);
        router.push(`${backHref}/${created.id}`);
        return;
      }
      const updated = await api.update(villaId!, form);
      setVilla(updated);
      setForm({ ...updated, conceptIds: updated.concepts.map((c) => c.id) });
      setDirty(false);
      setNotice('Kaydedildi.');
      setTimeout(() => setNotice(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }, [api, backHref, form, isCreate, router, villaId]);

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function onSubmitForReview() {
    if (!villaId) return;
    setError(null);
    try {
      const updated = await api.submit(villaId);
      setVilla(updated);
      setForm({ ...updated, conceptIds: updated.concepts.map((c) => c.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gönderilemedi.');
    }
  }

  async function onReview(status: 'PUBLISHED' | 'REJECTED') {
    if (!villaId || scope !== 'admin') return;
    if (status === 'REJECTED' && !confirm('Bu villa reddedilsin mi?')) return;
    setError(null);
    try {
      const note = status === 'REJECTED' ? prompt('Red gerekçesi (isteğe bağlı):') ?? undefined : undefined;
      const updated = await api.review(villaId, status, note);
      setVilla(updated);
      setForm({ ...updated, conceptIds: updated.concepts.map((c) => c.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız.');
    }
  }

  if (!isCreate && !villa && !error) {
    return <div className="flex h-full items-center justify-center text-[0.9rem] text-muted">Yükleniyor…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(backHref)} className="text-[0.85rem] text-muted transition-colors hover:text-ink">
            ← Villalar
          </button>
          <span className="h-4 w-px bg-line" />
          <h1 className="font-display text-lg font-light text-ink">{villa?.title || 'Yeni villa'}</h1>
          {villa && (
            <span className={`rounded-full px-2.5 py-1 text-[0.72rem] ${VILLA_STATUS_CLS[villa.status]}`}>
              {VILLA_STATUS_LABEL[villa.status]}
            </span>
          )}
          {dirty && (
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[0.72rem] text-gold">kaydedilmemiş değişiklik</span>
          )}
          {notice && <span className="text-[0.8rem] text-olive">{notice}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {error && <span className="text-[0.8rem] text-red-700">{error}</span>}

          {!isCreate && scope === 'host' && (villa?.status === 'DRAFT' || villa?.status === 'REJECTED') && (
            <button
              onClick={onSubmitForReview}
              className="rounded-full border border-olive/40 px-4 py-2 text-[0.82rem] text-olive transition-colors hover:bg-olive/10"
            >
              İncelemeye gönder
            </button>
          )}
          {!isCreate && scope === 'admin' && villa?.status === 'PENDING_REVIEW' && (
            <>
              <button
                onClick={() => onReview('REJECTED')}
                className="rounded-full border border-red-300 px-4 py-2 text-[0.82rem] text-red-700 transition-colors hover:bg-red-50"
              >
                Reddet
              </button>
              <button
                onClick={() => onReview('PUBLISHED')}
                className="rounded-full bg-ink px-4 py-2 text-[0.82rem] text-canvas transition-colors hover:bg-olive"
              >
                Onayla ve yayınla
              </button>
            </>
          )}

          <button
            onClick={save}
            disabled={saving || (!isCreate && !dirty)}
            className="rounded-full bg-ink px-5 py-2 text-[0.85rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
          >
            {saving ? 'Kaydediliyor…' : isCreate ? 'Villayı oluştur' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-52 shrink-0 space-y-0.5 overflow-y-auto border-r border-line bg-sand/20 px-2.5 py-4">
          {TABS.filter((t) => !t.editOnly || !isCreate).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-[0.85rem] transition-colors ${
                tab === t.id ? 'bg-ink text-canvas' : 'text-ink-soft hover:bg-sand-deep/60 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-8 py-10">
          {tab === 'temel' && (
          <Section n="1" title="Temel Bilgiler">
            <Field label="Başlık" required>
              <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Villa Meltem" />
            </Field>
            <Field label="Kısa açıklama">
              <TextArea value={form.summary ?? ''} onChange={(e) => set('summary', e.target.value)} />
            </Field>
            <Row>
              <Field label="Bölge" required>
                <Select
                  value={form.regionId}
                  onChange={(v) => set('regionId', v)}
                  options={[{ value: '', label: 'Seçin…' }, ...regions.map((r) => ({ value: r.id, label: r.name }))]}
                />
              </Field>
              <Field label="Semt / mahalle">
                <TextInput value={form.district ?? ''} onChange={(e) => set('district', e.target.value)} />
              </Field>
            </Row>
            <Field label="Bina ve konum tipi" required>
              <Select value={form.buildingType} onChange={(v) => set('buildingType', v)} options={BUILDING_TYPES} />
            </Field>
            <Field
              label="T.C. Kültür ve Turizm Bakanlığı İzin Belge No"
              hint="Villa detay sayfasının altında zorunlu rozette gösterilir."
            >
              <TextInput value={form.permitNumber ?? ''} onChange={(e) => set('permitNumber', e.target.value)} />
            </Field>

            <div>
              <span className="eyebrow text-muted">Konseptler</span>
              <span className="mt-1 block text-[0.76rem] text-muted/80">
                Balayı, denize sıfır gibi koleksiyonlarda gösterilsin mi? (isteğe bağlı, birden fazla seçilebilir)
              </span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {concepts.map((c) => (
                  <TagChip
                    key={c.id}
                    label={c.name}
                    active={form.conceptIds.includes(c.id)}
                    onClick={() =>
                      set(
                        'conceptIds',
                        form.conceptIds.includes(c.id)
                          ? form.conceptIds.filter((x) => x !== c.id)
                          : [...form.conceptIds, c.id],
                      )
                    }
                  />
                ))}
                {!concepts.length && <span className="text-[0.82rem] text-muted">Henüz konsept tanımlanmamış.</span>}
              </div>
            </div>
          </Section>
          )}

          {tab === 'kapasite' && (
          <Section n="2" title="Kapasite ve Mekan">
            <Row cols={3}>
              <Field label="Yetişkin" required>
                <TextInput type="number" min={1} value={form.maxAdults} onChange={(e) => set('maxAdults', Number(e.target.value))} />
              </Field>
              <Field label="Çocuk">
                <TextInput type="number" min={0} value={form.maxChildren} onChange={(e) => set('maxChildren', Number(e.target.value))} />
              </Field>
              <Field label="Bebek">
                <TextInput type="number" min={0} value={form.maxInfants} onChange={(e) => set('maxInfants', Number(e.target.value))} />
              </Field>
            </Row>
            <Row>
              <Field label="Yatak odası sayısı" required>
                <TextInput type="number" min={0} value={form.bedrooms} onChange={(e) => set('bedrooms', Number(e.target.value))} />
              </Field>
              <Field label="Banyo / tuvalet sayısı" required>
                <TextInput type="number" min={0} value={form.bathrooms} onChange={(e) => set('bathrooms', Number(e.target.value))} />
              </Field>
            </Row>
          </Section>
          )}

          {tab === 'odalar' && (
          <Section n="3" title="Oda Kırılımı" hint="Her yatak odası için tip, banyo ve jakuzi bilgisi.">
            <RoomsEditor rooms={form.rooms} onChange={(rooms) => set('rooms', rooms)} />
          </Section>
          )}

          {tab === 'konsept' && (
          <Section n="4" title="Konsept ve Nitelikler">
            <Field label="Havuz tipi">
              <Select value={form.poolType} onChange={(v) => set('poolType', v)} options={POOL_TYPES} />
            </Field>
            {form.poolType !== 'NONE' && (
              <>
                <Row cols={3}>
                  <Toggle label="Korunaklı (mahremiyetli)" checked={form.poolSecluded} onChange={(v) => set('poolSecluded', v)} />
                  <Toggle label="Isıtmalı" checked={form.poolHeated} onChange={(v) => set('poolHeated', v)} />
                  <Toggle label="Çocuk havuzu var" checked={form.poolHasChildPool} onChange={(v) => set('poolHasChildPool', v)} />
                </Row>
                {form.poolHeated && (
                  <Row cols={2}>
                    <Toggle
                      label="Isıtma fiyata dahil"
                      checked={form.poolHeatingIncluded}
                      onChange={(v) => set('poolHeatingIncluded', v)}
                    />
                    {!form.poolHeatingIncluded && (
                      <Field label="Günlük ısıtma ücreti (₺)">
                        <TextInput
                          type="number"
                          min={0}
                          value={form.poolHeatingFeePerDay ?? ''}
                          onChange={(e) => set('poolHeatingFeePerDay', Number(e.target.value))}
                        />
                      </Field>
                    )}
                  </Row>
                )}
                <Row cols={3}>
                  <Field label="Uzunluk (m)">
                    <TextInput type="number" min={0} value={form.poolLengthM ?? ''} onChange={(e) => set('poolLengthM', Number(e.target.value))} />
                  </Field>
                  <Field label="Genişlik (m)">
                    <TextInput type="number" min={0} value={form.poolWidthM ?? ''} onChange={(e) => set('poolWidthM', Number(e.target.value))} />
                  </Field>
                  <Field label="Derinlik (m)">
                    <TextInput type="number" min={0} value={form.poolDepthM ?? ''} onChange={(e) => set('poolDepthM', Number(e.target.value))} />
                  </Field>
                </Row>
              </>
            )}

            <Row cols={3}>
              <Field label="Wi‑Fi hızı (Mbps)">
                <TextInput type="number" min={0} value={form.wifiMbps ?? ''} onChange={(e) => set('wifiMbps', Number(e.target.value))} />
              </Field>
              <Field label="Plaja mesafe (m)">
                <TextInput type="number" min={0} value={form.beachDistanceM ?? ''} onChange={(e) => set('beachDistanceM', Number(e.target.value))} />
              </Field>
              <Toggle label="Merkeze yakın" checked={form.nearCenter} onChange={(v) => set('nearCenter', v)} />
            </Row>

            <div>
              <span className="eyebrow text-muted">Manzara</span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {VIEW_TAGS.map((t) => (
                  <TagChip
                    key={t.value}
                    label={t.label}
                    active={form.viewTags.includes(t.value)}
                    onClick={() =>
                      set(
                        'viewTags',
                        form.viewTags.includes(t.value)
                          ? form.viewTags.filter((x) => x !== t.value)
                          : [...form.viewTags, t.value],
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="eyebrow text-muted">Diğer donanım</span>
              <TagInput values={form.amenities} onChange={(v) => set('amenities', v)} suggestions={AMENITY_SUGGESTIONS} />
            </div>

            <Field label="Video tur linki" hint="YouTube veya Vimeo bağlantısı.">
              <TextInput value={form.videoUrl ?? ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/…" />
            </Field>
          </Section>
          )}

          {tab === 'fiyat' && (
          <Section n="5" title="Fiyatlandırma ve Masraflar">
            <Row cols={3}>
              <Field label="Gecelik fiyat (baz)" required>
                <TextInput type="number" min={0} value={form.pricePerNight} onChange={(e) => set('pricePerNight', Number(e.target.value))} />
              </Field>
              <Field label="Para birimi">
                <Select value={form.currency} onChange={(v) => set('currency', v)} options={[
                  { value: 'TRY', label: 'TRY' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'USD', label: 'USD' },
                ]} />
              </Field>
              <Field label="Minimum konaklama (gece)">
                <TextInput type="number" min={1} value={form.minNights} onChange={(e) => set('minNights', Number(e.target.value))} />
              </Field>
            </Row>
            <Row cols={2}>
              <Field label="Temizlik ücreti (₺)">
                <TextInput type="number" min={0} value={form.cleaningFee} onChange={(e) => set('cleaningFee', Number(e.target.value))} />
              </Field>
              <Field
                label="Temizlik ücreti eşiği (gece)"
                hint="Bu gece sayısının ALTINDAKİ konaklamalarda temizlik ücreti uygulanır, üzerinde uygulanmaz."
              >
                <TextInput
                  type="number"
                  min={1}
                  value={form.cleaningFeeThresholdNights}
                  onChange={(e) => set('cleaningFeeThresholdNights', Number(e.target.value))}
                />
              </Field>
            </Row>
            <Field label="Hasar depozitosu (₺)" required hint="Girişte alınır, çıkışta kontrol sonrası iade edilir.">
              <TextInput type="number" min={0} value={form.depositAmount} onChange={(e) => set('depositAmount', Number(e.target.value))} />
            </Field>
            <Row cols={3}>
              <Toggle label="Elektrik/su fiyata dahil" checked={form.utilitiesIncluded} onChange={(v) => set('utilitiesIncluded', v)} />
              <Toggle label="Tüpgaz fiyata dahil" checked={form.gasIncluded} onChange={(v) => set('gasIncluded', v)} />
              <Field label="Ara temizlik ücreti (₺)">
                <TextInput
                  type="number"
                  min={0}
                  value={form.extraCleaningFee ?? ''}
                  onChange={(e) => set('extraCleaningFee', Number(e.target.value))}
                />
              </Field>
            </Row>

            {priceRange && (
              <p className="text-[0.85rem] text-muted">
                Sitede gösterilecek fiyat aralığı: <span className="text-ink">₺{priceRange.min.toLocaleString('tr-TR')} – ₺{priceRange.max.toLocaleString('tr-TR')}</span> / gece
                <span className="text-muted/70"> (baz fiyat + sezonluk kurallardan hesaplanır)</span>
              </p>
            )}

            {scope === 'admin' && (
              <Field
                label="Komisyon oranı (%)"
                hint="Boş bırakılırsa genel varsayılan komisyon oranı uygulanır. Yalnızca yönetici görür ve değiştirir."
              >
                <TextInput
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.commissionRate ?? ''}
                  onChange={(e) => set('commissionRate', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </Field>
            )}
          </Section>
          )}

          {tab === 'kurallar' && (
          <Section n="6" title="Kurallar">
            <Field label="Evcil hayvan politikası">
              <Select value={form.petPolicy} onChange={(v) => set('petPolicy', v)} options={PET_POLICIES} />
            </Field>
            {form.petPolicy !== 'NOT_ALLOWED' && (
              <Field label="Irk / kilo kısıtı, not">
                <TextInput value={form.petNote ?? ''} onChange={(e) => set('petNote', e.target.value)} />
              </Field>
            )}

            <Row cols={3}>
              <Toggle label="Sadece ailelere uygun" checked={form.familiesOnly} onChange={(v) => set('familiesOnly', v)} />
              <Toggle
                label="Bekar erkek gruplarına uygun"
                checked={form.allowSingleMaleGroups}
                onChange={(v) => set('allowSingleMaleGroups', v)}
              />
              <Toggle label="Genç arkadaş gruplarına uygun" checked={form.allowYoungGroups} onChange={(v) => set('allowYoungGroups', v)} />
            </Row>
            <Row cols={2}>
              <Toggle label="Parti / etkinliğe izin var" checked={form.eventsAllowed} onChange={(v) => set('eventsAllowed', v)} />
              <Toggle label="Kapalı alanda sigaraya izin var" checked={form.smokingAllowed} onChange={(v) => set('smokingAllowed', v)} />
            </Row>

            <Row cols={3}>
              <Field label="Giriş saati (check‑in)">
                <TextInput type="time" value={form.checkInTime} onChange={(e) => set('checkInTime', e.target.value)} />
              </Field>
              <Field label="Çıkış saati (check‑out)">
                <TextInput type="time" value={form.checkOutTime} onChange={(e) => set('checkOutTime', e.target.value)} />
              </Field>
              <Field label="Giriş günü kısıtı" hint="Örn. yalnızca Cumartesi giriş.">
                <Select
                  value={form.checkInWeekday === null || form.checkInWeekday === undefined ? '' : String(form.checkInWeekday)}
                  onChange={(v) => set('checkInWeekday', v === '' ? null : Number(v))}
                  options={[{ value: '', label: 'Kısıt yok' }, ...WEEKDAYS.map((w, i) => ({ value: String(i), label: w }))]}
                />
              </Field>
            </Row>

            <div>
              <span className="eyebrow text-muted">Ek kurallar</span>
              <span className="mt-1 block text-[0.76rem] text-muted/80">
                Yukarıdakilerin dışında, bu villaya özel bir kural varsa yazıp Enter'a basın.
              </span>
              <TagInput values={form.customRules} onChange={(v) => set('customRules', v)} suggestions={[]} />
            </div>
          </Section>
          )}

          {tab === 'gorseller' && (
            isCreate ? (
              <EditOnlyNotice />
            ) : (
              <Section
                n="7"
                title="Görseller"
                hint={`En az ${MIN_PUBLISH_IMAGES} fotoğraf yüklenmeli (yayına göndermek için). Yatay format, en az ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT} piksel önerilir.`}
              >
                <ImagesManager api={api} villaId={villaId!} images={villa?.images ?? []} onChange={load} />
              </Section>
            )
          )}

          {tab === 'fiyatKurallari' && (
            isCreate ? (
              <EditOnlyNotice />
            ) : (
              <Section n="8" title="Sezonluk Fiyat Kuralları">
                <PriceRulesManager api={api} villaId={villaId!} rules={villa?.priceRules ?? []} onChange={load} />
              </Section>
            )
          )}

          {tab === 'takvim' && (
            isCreate ? (
              <EditOnlyNotice />
            ) : (
              <Section n="9" title="Takvim — Manuel Bloklama" hint="Ev sahibinin kendi kullanımı veya bakım için tarih kapatma.">
                <CalendarManager api={api} villaId={villaId!} blocks={villa?.blockedDates ?? []} onChange={load} />
              </Section>
            )
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditOnlyNotice() {
  return (
    <p className="rounded-xl border border-dashed border-line bg-sand/30 px-5 py-6 text-center text-[0.88rem] text-muted">
      Görsel yükleme, sezonluk fiyat kuralları ve takvim bloklama, villa oluşturulduktan sonra açılır.
    </p>
  );
}

// ---------------------------------------------------------------------------

function RoomsEditor({ rooms, onChange }: { rooms: VillaRoom[]; onChange: (rooms: VillaRoom[]) => void }) {
  const add = () =>
    onChange([...rooms, { bedType: 'DOUBLE', bedCount: 1, hasEnsuite: false, hasJacuzzi: false, note: '' }]);
  const update = (i: number, patch: Partial<VillaRoom>) =>
    onChange(rooms.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rooms.filter((_, k) => k !== i));

  return (
    <div>
      <div className="space-y-3">
        {rooms.map((r, i) => (
          <div key={i} className="rounded-lg border border-line bg-sand/25 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[0.85rem] text-ink">{i + 1}. Yatak Odası</span>
              <button onClick={() => remove(i)} className="text-[0.8rem] text-muted transition-colors hover:text-red-700">
                Sil
              </button>
            </div>
            <Row cols={2}>
              <Field label="Yatak tipi">
                <Select value={r.bedType} onChange={(v) => update(i, { bedType: v })} options={BED_TYPES} />
              </Field>
              <Field label="Yatak sayısı">
                <TextInput type="number" min={1} value={r.bedCount} onChange={(e) => update(i, { bedCount: Number(e.target.value) })} />
              </Field>
            </Row>
            <div className="mt-3 flex flex-wrap gap-5">
              <Toggle label="Ebeveyn banyosu" checked={r.hasEnsuite} onChange={(v) => update(i, { hasEnsuite: v })} />
              <Toggle label="Jakuzi" checked={r.hasJacuzzi} onChange={(v) => update(i, { hasJacuzzi: v })} />
            </div>
          </div>
        ))}
        {!rooms.length && <p className="text-[0.85rem] text-muted">Henüz oda eklenmedi.</p>}
      </div>
      <button
        onClick={add}
        className="mt-3 rounded-lg border border-dashed border-line px-4 py-2 text-[0.83rem] text-muted transition-colors hover:border-olive-soft hover:text-ink"
      >
        + Oda ekle
      </button>
    </div>
  );
}

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] transition-colors ${
        active ? 'border-olive bg-olive/10 text-olive' : 'border-line text-muted hover:border-ink/30 hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function TagInput({ values, onChange, suggestions }: { values: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setText('');
  };
  return (
    <div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1.5 rounded-full bg-sand-deep/70 px-3 py-1.5 text-[0.82rem] text-ink">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-muted hover:text-ink">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            }
          }}
          placeholder="Yazıp Enter'a basın…"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.filter((s) => !values.includes(s)).map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            className="rounded-full border border-line px-2.5 py-1 text-[0.76rem] text-muted transition-colors hover:border-ink/30 hover:text-ink"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImagesManager({
  api,
  villaId,
  images,
  onChange,
}: {
  api: VillaApi;
  villaId: string;
  images: VillaImage[];
  onChange: () => void;
}) {
  const [category, setCategory] = useState<string>('LIVING_KITCHEN');
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWarning(null);
    const dims = await readImageDimensions(file);
    if (dims && (dims.width < MIN_IMAGE_WIDTH || dims.height < MIN_IMAGE_HEIGHT)) {
      setWarning(`Bu görsel ${dims.width}×${dims.height} px — önerilen en az ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT} px.`);
    }
    setBusy(true);
    try {
      await api.uploadImage(villaId, category, file, dims ?? undefined);
      onChange();
    } catch (err) {
      setWarning(err instanceof Error ? err.message : 'Görsel yüklenemedi.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const grouped = IMAGE_CATEGORIES.map((c) => ({
    ...c,
    items: images.filter((img) => img.category === c.value),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Kategori">
          <Select value={category} onChange={setCategory} options={IMAGE_CATEGORIES} />
        </Field>
        <label className="mb-0.5 cursor-pointer rounded-full border border-dashed border-line px-4 py-2 text-[0.83rem] text-muted transition-colors hover:border-olive-soft hover:text-ink">
          {busy ? 'Yükleniyor…' : '+ Görsel yükle'}
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" disabled={busy} onChange={onPick} />
        </label>
        <span className="text-[0.8rem] text-muted">{images.length} / {MIN_PUBLISH_IMAGES}+ yüklendi</span>
      </div>
      {warning && <p className="mt-2 text-[0.82rem] text-gold">{warning}</p>}

      <div className="mt-6 space-y-6">
        {grouped.map((g) => (
          <div key={g.value}>
            <p className="eyebrow text-muted">{g.label} ({g.items.length})</p>
            {g.items.length ? (
              <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {g.items.map((img) => (
                  <div key={img.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    {img.isCover && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 text-[0.65rem] text-white">
                        Kapak
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {!img.isCover && (
                        <button
                          onClick={async () => {
                            await api.updateImage(villaId, img.id, { isCover: true });
                            onChange();
                          }}
                          className="rounded bg-white/90 px-1.5 py-1 text-[0.65rem] text-ink"
                        >
                          Kapak yap
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await api.removeImage(villaId, img.id);
                          onChange();
                        }}
                        className="ml-auto rounded bg-white/90 px-1.5 py-1 text-[0.65rem] text-red-700"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[0.8rem] text-muted/70">Henüz görsel yok.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function PriceRulesManager({
  api,
  villaId,
  rules,
  onChange,
}: {
  api: VillaApi;
  villaId: string;
  rules: VillaPriceRule[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({ startDate: '', endDate: '', pricePerNight: '', minNights: '' });
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      await api.addPriceRule(villaId, {
        startDate: form.startDate,
        endDate: form.endDate,
        pricePerNight: Number(form.pricePerNight),
        minNights: form.minNights ? Number(form.minNights) : undefined,
      });
      setForm({ startDate: '', endDate: '', pricePerNight: '', minNights: '' });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eklenemedi.');
    }
  }

  return (
    <div>
      <div className="divide-y divide-line border-y border-line">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 py-3">
            <span className="text-[0.88rem] text-ink">
              {fmtDate(r.startDate)} – {fmtDate(r.endDate)}
            </span>
            <span className="text-[0.88rem] text-muted">
              ₺{r.pricePerNight.toLocaleString('tr-TR')} / gece{r.minNights ? ` · min ${r.minNights} gece` : ''}
            </span>
            <button
              onClick={async () => {
                await api.removePriceRule(villaId, r.id);
                onChange();
              }}
              className="text-[0.8rem] text-muted transition-colors hover:text-red-700"
            >
              Sil
            </button>
          </div>
        ))}
        {!rules.length && <p className="py-3 text-[0.85rem] text-muted">Henüz sezonluk kural yok — baz fiyat geçerli.</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextInput type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
        <TextInput type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
        <TextInput
          type="number"
          placeholder="Gecelik ₺"
          value={form.pricePerNight}
          onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
        />
        <TextInput
          type="number"
          placeholder="Min gece (ops.)"
          value={form.minNights}
          onChange={(e) => setForm((f) => ({ ...f, minNights: e.target.value }))}
        />
      </div>
      {error && <p className="mt-2 text-[0.82rem] text-red-700">{error}</p>}
      <button
        onClick={add}
        disabled={!form.startDate || !form.endDate || !form.pricePerNight}
        className="mt-3 rounded-lg border border-dashed border-line px-4 py-2 text-[0.83rem] text-muted transition-colors hover:border-olive-soft hover:text-ink disabled:opacity-40"
      >
        + Kural ekle
      </button>
    </div>
  );
}

function CalendarManager({
  api,
  villaId,
  blocks,
  onChange,
}: {
  api: VillaApi;
  villaId: string;
  blocks: VillaBlockedDate[];
  onChange: () => void;
}) {
  const [form, setForm] = useState<{
    startDate: string;
    endDate: string;
    kind: VillaBlockedDate['kind'];
    note: string;
  }>({ startDate: '', endDate: '', kind: 'MANUAL', note: '' });
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadCalendar = useCallback(async () => {
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 62 * 86_400_000).toISOString().slice(0, 10);
    const result = await api.calendar(villaId, from, to);
    setEvents(result.events);
  }, [api, villaId]);

  useEffect(() => { void loadCalendar().catch(() => {}); }, [loadCalendar]);

  async function add() {
    setError(null);
    try {
      await api.addBlockedDate(villaId, form);
      setForm({ startDate: '', endDate: '', kind: 'MANUAL', note: '' });
      onChange();
      await loadCalendar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eklenemedi.');
    }
  }

  return (
    <div>
      <div className="divide-y divide-line border-y border-line">
        {events.map((event) => (
          <div key={`${event.source}-${event.id}`} className="flex items-center justify-between gap-4 py-3">
            <span className="text-[0.88rem] text-ink">
              {fmtDate(event.startDate)} – {fmtDate(event.endDate)}
            </span>
            <span className="text-[0.85rem] text-muted">{event.title}</span>
            <span className="rounded-full bg-sand px-2.5 py-1 text-[0.74rem] text-muted">
              {event.source === 'BOOKING' ? (event.kind === 'HOLD' ? 'Bekletme' : 'Rezervasyon') : BLOCK_KIND_LABEL[event.kind]}
            </span>
            {event.source === 'BLOCK' && <button
              onClick={async () => {
                await api.removeBlockedDate(villaId, event.id, event.version);
                onChange();
                await loadCalendar();
              }}
              className="text-[0.8rem] text-muted transition-colors hover:text-red-700"
            >
              Kaldır
            </button>}
          </div>
        ))}
        {!events.length && !blocks.length && <p className="py-3 text-[0.85rem] text-muted">Önümüzdeki 62 günde dolu tarih yok.</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextInput type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
        <TextInput type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
        <Select value={form.kind} onChange={(kind) => setForm((f) => ({ ...f, kind: kind as VillaBlockedDate['kind'] }))} options={BLOCK_KIND_OPTIONS} />
        <TextInput placeholder="Not (ops.)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </div>
      {error && <p className="mt-2 text-[0.82rem] text-red-700">{error}</p>}
      <button
        onClick={add}
        disabled={!form.startDate || !form.endDate}
        className="mt-3 rounded-lg border border-dashed border-line px-4 py-2 text-[0.83rem] text-muted transition-colors hover:border-olive-soft hover:text-ink disabled:opacity-40"
      >
        + Tarih blokla
      </button>
    </div>
  );
}

const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('tr-TR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
