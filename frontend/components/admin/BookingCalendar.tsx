'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/http';
import {
  bookingApi,
  type BlockKind,
  type CalendarAudit,
  type CalendarData,
  type CalendarEvent,
} from '@/lib/bookingApi';

const DAY = 86_400_000;
const WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const INPUT = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.84rem] text-ink outline-none focus:border-olive-soft focus-visible:ring-2 focus-visible:ring-olive/20';
const EVENT_LABEL: Record<string, string> = {
  CONFIRMED: 'Onaylı rezervasyon',
  HOLD: 'Bekletme',
  MANUAL: 'Satışa kapalı',
  MAINTENANCE: 'Bakım',
  OWNER_USE: 'Ev sahibi kullanımı',
};
const AUDIT_LABEL: Record<string, string> = {
  HOLD_CREATED: 'Bekletme oluşturdu',
  HOLD_RELEASED: 'Bekletmeyi bıraktı',
  HOLD_EXPIRED: 'Bekletmenin süresi doldu',
  BOOKING_CREATED: 'Rezervasyon oluşturdu',
  BOOKING_CONFIRMED: 'Rezervasyonu onayladı',
  BOOKING_CHANGED: 'Rezervasyonu değiştirdi',
  BOOKING_CANCELLED: 'Rezervasyonu iptal etti',
  BLOCK_CREATED: 'Tarihi kapattı',
  BLOCK_RELEASED: 'Tarihi yeniden açtı',
  PRICE_RULE_CREATED: 'Sezon fiyatı ekledi',
  PRICE_RULE_REMOVED: 'Sezon fiyatını kaldırdı',
  VILLA_RULES_CHANGED: 'Satış kurallarını değiştirdi',
  VILLA_STATUS_CHANGED: 'Villa durumunu değiştirdi',
};

const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, count: number) => new Date(date.getTime() + count * DAY);
const dateLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('tr-TR', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

type BookingForm = {
  villaId: string;
  from: string;
  to: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  adults: number;
  children: number;
  infants: number;
};

const emptyBooking = (): BookingForm => ({
  villaId: '', from: '', to: '', customerName: '', customerEmail: '', customerPhone: '',
  adults: 2, children: 0, infants: 0,
});

export default function BookingCalendar() {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)));
  const [data, setData] = useState<CalendarData | null>(null);
  const [audits, setAudits] = useState<CalendarAudit[]>([]);
  const [regionId, setRegionId] = useState('');
  const [villaId, setVillaId] = useState('');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<'BOOKING' | 'BLOCK'>('BOOKING');
  const [bookingForm, setBookingForm] = useState<BookingForm>(emptyBooking);
  const [blockForm, setBlockForm] = useState({ villaId: '', startDate: '', endDate: '', kind: 'MANUAL' as BlockKind, note: '' });
  const [editForm, setEditForm] = useState({ from: '', to: '', adults: 2, children: 0, infants: 0 });
  const [cancelNote, setCancelNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = iso(month);
  const toDate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  const to = iso(toDate);
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let day = month; day < toDate; day = addDays(day, 1)) result.push(day);
    return result;
  }, [month, to]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [calendar, history] = await Promise.all([bookingApi.calendar(from, to), bookingApi.audit(villaId || undefined)]);
      setData(calendar);
      setAudits(history);
      setSelected((current) => current ? calendar.events.find((event) => event.id === current.id) ?? null : null);
      setRelatedEvents((current) => current.map((item) => calendar.events.find((event) => event.id === item.id)).filter((event): event is CalendarEvent => Boolean(event)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Takvim yüklenemedi.');
    }
  }, [from, to, villaId]);

  useEffect(() => { void load(); }, [load]);

  const regions = useMemo(() => {
    const seen = new Map<string, string>();
    data?.villas.forEach((villa) => seen.set(villa.region.id, villa.region.name));
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [data]);
  const villas = (data?.villas ?? []).filter((villa) =>
    (!regionId || villa.region.id === regionId) && (!villaId || villa.id === villaId));
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    data?.events.forEach((event) => {
      for (let day = event.startDate < from ? from : event.startDate; day < event.endDate && day < to; day = iso(addDays(new Date(`${day}T00:00:00Z`), 1))) {
        const key = `${event.villaId}:${day}`;
        map.set(key, [...(map.get(key) ?? []), event]);
      }
    });
    return map;
  }, [data, from, to]);

  function chooseEvent(event: CalendarEvent, related = relatedEvents.length ? relatedEvents : [event]) {
    setSelected(event);
    setRelatedEvents(related);
    setEditForm({
      from: event.startDate,
      to: event.endDate,
      adults: event.adults ?? 2,
      children: event.children ?? 0,
      infants: event.infants ?? 0,
    });
    setCancelNote('');
    setError(null);
  }

  function chooseEmpty(villa: string, day: Date) {
    const start = iso(day);
    const end = iso(addDays(day, 1));
    setSelected(null);
    setRelatedEvents([]);
    if (mode === 'BOOKING') setBookingForm((form) => ({ ...form, villaId: villa, from: start, to: end }));
    else setBlockForm((form) => ({ ...form, villaId: villa, startDate: start, endDate: end }));
  }

  async function act(action: () => Promise<unknown>, success?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      success?.();
      await load();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await load();
        setError(`${cause.message} Takvim yenilendi.`);
      } else {
        setError(cause instanceof Error ? cause.message : 'İşlem tamamlanamadı.');
      }
    } finally {
      setBusy(false);
    }
  }

  const monthLabel = month.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3 sm:px-6">
        <div>
          <p className="eyebrow text-gold">Operasyon</p>
          <h1 className="mt-1 font-display text-xl font-light text-ink">Rezervasyon takvimi</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))} className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-ink hover:text-ink" aria-label="Önceki ay">←</button>
          <button onClick={() => setMonth(new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)))} className="rounded-md border border-line px-3 py-2 text-[0.82rem] text-muted hover:border-ink hover:text-ink">Bugün</button>
          <p className="min-w-32 text-center font-display text-lg capitalize text-ink">{monthLabel}</p>
          <button onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))} className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-ink hover:text-ink" aria-label="Sonraki ay">→</button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-canvas px-5 py-3 sm:px-6">
        <select value={regionId} onChange={(event) => { setRegionId(event.target.value); setVillaId(''); }} className={`${INPUT} w-auto min-w-40`}>
          <option value="">Tüm bölgeler</option>
          {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select>
        <select value={villaId} onChange={(event) => setVillaId(event.target.value)} className={`${INPUT} w-auto min-w-48`}>
          <option value="">Tüm villalar</option>
          {(data?.villas ?? []).filter((villa) => !regionId || villa.region.id === regionId).map((villa) => <option key={villa.id} value={villa.id}>{villa.title}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-x-4 gap-y-1 text-[0.74rem] text-muted">
          <Legend color="bg-olive" label="Onaylı" />
          <Legend color="bg-gold" label="Bekletme" />
          <Legend color="bg-sky-700" label="Bakım" />
          <Legend color="bg-violet-700" label="Ev sahibi" />
          <Legend color="bg-stone-500" label="Kapalı" />
        </div>
      </div>

      {error && <p role="alert" className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-[0.82rem] text-red-800">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_40px_rgba(38,34,28,0.04)]">
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${220 + days.length * 38}px` }}>
                <div className="grid border-b border-line bg-sand/35" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(38px, 1fr))` }}>
                  <div className="sticky left-0 z-20 bg-sand px-4 py-3 text-[0.76rem] font-medium text-muted">Villa / gün</div>
                  {days.map((day) => {
                    const current = iso(day) === iso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
                    return <div key={iso(day)} className={`border-l border-line/70 py-2 text-center ${current ? 'bg-gold/10' : ''}`}>
                      <p className="text-[0.62rem] uppercase text-muted">{WEEKDAYS[day.getUTCDay()]}</p>
                      <p className={`mt-0.5 text-[0.78rem] ${current ? 'font-semibold text-gold' : 'text-ink'}`}>{day.getUTCDate()}</p>
                    </div>;
                  })}
                </div>
                {villas.map((villa) => (
                  <div key={villa.id} className="grid border-b border-line/70 last:border-b-0" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(38px, 1fr))` }}>
                    <div className="sticky left-0 z-10 flex min-h-12 items-center border-r border-line bg-surface px-4">
                      <div className="min-w-0">
                        <p className="truncate text-[0.82rem] font-medium text-ink">{villa.title}</p>
                        <p className="truncate text-[0.68rem] text-muted">{villa.region.name}</p>
                      </div>
                    </div>
                    {days.map((day) => {
                      const date = iso(day);
                      const events = eventsByDay.get(`${villa.id}:${date}`) ?? [];
                      const event = events.sort((a, b) => priority(a.kind) - priority(b.kind))[0];
                      return <button
                        key={date}
                        onClick={() => event ? chooseEvent(event, events) : chooseEmpty(villa.id, day)}
                        aria-label={`${villa.title}, ${date}${event ? `, ${EVENT_LABEL[event.kind]}` : ', müsait'}`}
                        title={event ? `${EVENT_LABEL[event.kind]} · ${event.title}` : 'Müsait — işlem başlat'}
                        className={`relative min-h-12 border-l border-line/60 transition-colors focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${event ? eventColor(event.kind) : 'bg-white hover:bg-sand/70'}`}
                      >
                        {events.length > 1 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-600" />}
                      </button>;
                    })}
                  </div>
                ))}
                {data && villas.length === 0 && <p className="px-6 py-14 text-center text-sm text-muted">Bu filtreye uyan villa yok.</p>}
                {!data && !error && <p className="px-6 py-14 text-center text-sm text-muted">Takvim yükleniyor…</p>}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            {selected ? (
              <EventPanel event={selected} relatedEvents={relatedEvents} onSelect={chooseEvent} form={editForm} setForm={setEditForm} cancelNote={cancelNote} setCancelNote={setCancelNote} busy={busy} onClose={() => { setSelected(null); setRelatedEvents([]); }} onChange={() => act(() => bookingApi.change(selected.id, { ...editForm, version: selected.version }))} onConfirm={() => act(() => bookingApi.confirm(selected.id, selected.version))} onCancel={() => act(() => bookingApi.cancel(selected.id, selected.version, cancelNote))} onRelease={() => act(() => bookingApi.removeBlock(selected.villaId, selected.id, selected.version), () => { setSelected(null); setRelatedEvents([]); })} />
            ) : (
              <section className="rounded-xl border border-line bg-surface p-5">
                <div className="flex rounded-lg bg-sand p-1">
                  <ModeButton active={mode === 'BOOKING'} onClick={() => setMode('BOOKING')}>Rezervasyon</ModeButton>
                  <ModeButton active={mode === 'BLOCK'} onClick={() => setMode('BLOCK')}>Tarih kapat</ModeButton>
                </div>
                {mode === 'BOOKING' ? (
                  <BookingCreateForm form={bookingForm} setForm={setBookingForm} villas={data?.villas ?? []} busy={busy} onSubmit={() => act(() => bookingApi.create({ ...bookingForm, customerEmail: bookingForm.customerEmail || undefined, customerPhone: bookingForm.customerPhone || undefined }), () => setBookingForm(emptyBooking()))} />
                ) : (
                  <BlockCreateForm form={blockForm} setForm={setBlockForm} villas={data?.villas ?? []} busy={busy} onSubmit={() => act(() => bookingApi.addBlock(blockForm.villaId, blockForm), () => setBlockForm({ villaId: '', startDate: '', endDate: '', kind: 'MANUAL', note: '' }))} />
                )}
              </section>
            )}

            <section className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-light text-ink">Son işlemler</h2>
                <span className="text-[0.7rem] text-muted">{villaId ? 'Seçili villa' : 'Tüm villalar'}</span>
              </div>
              <div className="mt-4 divide-y divide-line">
                {audits.slice(0, 8).map((audit) => <div key={audit.id} className="py-3 first:pt-0">
                  <p className="text-[0.8rem] text-ink">{audit.actor?.name ?? 'Sistem'} · {AUDIT_LABEL[audit.action] ?? audit.action}</p>
                  <p className="mt-0.5 text-[0.72rem] text-muted">{audit.villa.title} · {new Date(audit.createdAt).toLocaleString('tr-TR')}</p>
                  {audit.reason && <p className="mt-1 line-clamp-2 text-[0.72rem] text-muted">{audit.reason}</p>}
                </div>)}
                {!audits.length && <p className="py-3 text-[0.8rem] text-muted">Henüz takvim işlemi yok.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BookingCreateForm({ form, setForm, villas, busy, onSubmit }: { form: BookingForm; setForm: React.Dispatch<React.SetStateAction<BookingForm>>; villas: CalendarData['villas']; busy: boolean; onSubmit: () => void }) {
  const set = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.villaId && form.from && form.to && form.customerName.trim().length >= 2 && (form.customerEmail || form.customerPhone);
  return <div className="mt-5 space-y-3">
    <h2 className="font-display text-lg font-light text-ink">Yeni onaylı rezervasyon</h2>
    <select value={form.villaId} onChange={(event) => set('villaId', event.target.value)} className={INPUT}><option value="">Villa seçin</option>{villas.map((villa) => <option key={villa.id} value={villa.id}>{villa.title}</option>)}</select>
    <div className="grid grid-cols-2 gap-2"><input aria-label="Giriş" type="date" value={form.from} onChange={(event) => set('from', event.target.value)} className={INPUT} /><input aria-label="Çıkış" type="date" value={form.to} onChange={(event) => set('to', event.target.value)} className={INPUT} /></div>
    <input placeholder="Misafir adı" value={form.customerName} onChange={(event) => set('customerName', event.target.value)} className={INPUT} />
    <input aria-label="E-posta" type="email" placeholder="E-posta" value={form.customerEmail} onChange={(event) => set('customerEmail', event.target.value)} className={INPUT} />
    <input aria-label="Telefon" type="tel" placeholder="Telefon" value={form.customerPhone} onChange={(event) => set('customerPhone', event.target.value)} className={INPUT} />
    <GuestFields value={form} onChange={(key, value) => set(key, value)} />
    <button disabled={!valid || busy} onClick={onSubmit} className="w-full rounded-full bg-ink py-2.5 text-[0.84rem] text-canvas hover:bg-olive disabled:opacity-40">Rezervasyon oluştur</button>
  </div>;
}

function BlockCreateForm({ form, setForm, villas, busy, onSubmit }: { form: { villaId: string; startDate: string; endDate: string; kind: BlockKind; note: string }; setForm: React.Dispatch<React.SetStateAction<{ villaId: string; startDate: string; endDate: string; kind: BlockKind; note: string }>>; villas: CalendarData['villas']; busy: boolean; onSubmit: () => void }) {
  return <div className="mt-5 space-y-3">
    <h2 className="font-display text-lg font-light text-ink">Takvimde tarih kapat</h2>
    <select value={form.villaId} onChange={(event) => setForm({ ...form, villaId: event.target.value })} className={INPUT}><option value="">Villa seçin</option>{villas.map((villa) => <option key={villa.id} value={villa.id}>{villa.title}</option>)}</select>
    <div className="grid grid-cols-2 gap-2"><input aria-label="Başlangıç" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className={INPUT} /><input aria-label="Bitiş" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className={INPUT} /></div>
    <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as BlockKind })} className={INPUT}><option value="MANUAL">Satışa kapalı</option><option value="MAINTENANCE">Bakım</option><option value="OWNER_USE">Ev sahibi kullanımı</option></select>
    <input placeholder="Gerekçe / not" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={INPUT} />
    <button disabled={!form.villaId || !form.startDate || !form.endDate || busy} onClick={onSubmit} className="w-full rounded-full bg-ink py-2.5 text-[0.84rem] text-canvas hover:bg-olive disabled:opacity-40">Tarihleri kapat</button>
  </div>;
}

function EventPanel({ event, relatedEvents, onSelect, form, setForm, cancelNote, setCancelNote, busy, onClose, onChange, onConfirm, onCancel, onRelease }: { event: CalendarEvent; relatedEvents: CalendarEvent[]; onSelect: (event: CalendarEvent, related?: CalendarEvent[]) => void; form: { from: string; to: string; adults: number; children: number; infants: number }; setForm: React.Dispatch<React.SetStateAction<{ from: string; to: string; adults: number; children: number; infants: number }>>; cancelNote: string; setCancelNote: (value: string) => void; busy: boolean; onClose: () => void; onChange: () => void; onConfirm: () => void; onCancel: () => void; onRelease: () => void }) {
  return <section className="rounded-xl border border-line bg-surface p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="eyebrow text-gold">{EVENT_LABEL[event.kind]}</p><h2 className="mt-2 font-display text-xl font-light text-ink">{event.title}</h2></div><button onClick={onClose} aria-label="Kapat" className="text-xl text-muted hover:text-ink">×</button></div>
    <p className="mt-2 text-[0.8rem] text-muted">{dateLabel(event.startDate)} – {dateLabel(event.endDate)}</p>
    {relatedEvents.length > 1 && <div className="mt-4 rounded-lg border border-red-200 bg-red-50/60 p-3"><p className="text-[0.7rem] font-medium text-red-800">Bu günü kapatan {relatedEvents.length} neden var</p><div className="mt-2 flex flex-wrap gap-1.5">{relatedEvents.map((item) => <button key={`${item.source}-${item.id}`} onClick={() => onSelect(item, relatedEvents)} className={`rounded-full border px-2.5 py-1 text-[0.7rem] ${item.id === event.id ? 'border-red-700 bg-red-700 text-white' : 'border-red-200 bg-white text-red-800'}`}>{EVENT_LABEL[item.kind]}</button>)}</div></div>}
    {event.source === 'BOOKING' ? <div className="mt-5 space-y-3">
      {(event.email || event.phone) && <p className="rounded-lg bg-sand/60 p-3 text-[0.78rem] leading-relaxed text-muted">{event.email}<br />{event.phone}</p>}
      <div className="grid grid-cols-2 gap-2"><input aria-label="Yeni giriş" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={INPUT} /><input aria-label="Yeni çıkış" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className={INPUT} /></div>
      <GuestFields value={form} onChange={(key, value) => setForm({ ...form, [key]: value })} />
      <button disabled={busy} onClick={onChange} className="w-full rounded-full border border-ink py-2.5 text-[0.82rem] text-ink hover:bg-ink hover:text-canvas disabled:opacity-40">Değişiklikleri kaydet</button>
      {event.kind === 'HOLD' && <button disabled={busy} onClick={onConfirm} className="w-full rounded-full bg-olive py-2.5 text-[0.82rem] text-white disabled:opacity-40">Bekletmeyi onayla</button>}
      <div className="border-t border-line pt-3"><input placeholder="İptal gerekçesi" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} className={INPUT} /><button disabled={busy || cancelNote.trim().length < 2} onClick={onCancel} className="mt-2 text-[0.78rem] text-red-700 disabled:opacity-40">Rezervasyonu iptal et</button></div>
    </div> : <div className="mt-5">
      {event.note && <p className="rounded-lg bg-sand/60 p-3 text-[0.8rem] text-muted">{event.note}</p>}
      <button disabled={busy} onClick={onRelease} className="mt-4 w-full rounded-full border border-ink py-2.5 text-[0.82rem] text-ink hover:bg-ink hover:text-canvas disabled:opacity-40">Bu nedeni kaldır</button>
      <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">Aynı gün başka bir nedenle kapalıysa tarih kapalı kalır.</p>
    </div>}
  </section>;
}

function GuestFields({ value, onChange }: { value: { adults: number; children: number; infants: number }; onChange: (key: 'adults' | 'children' | 'infants', value: number) => void }) {
  return <div className="grid grid-cols-3 gap-2">{([['adults', 'Yetişkin'], ['children', 'Çocuk'], ['infants', 'Bebek']] as const).map(([key, label]) => <label key={key} className="text-[0.68rem] text-muted">{label}<input type="number" min={key === 'adults' ? 1 : 0} value={value[key]} onChange={(event) => onChange(key, Number(event.target.value))} className={`${INPUT} mt-1`} /></label>)}</div>;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex-1 rounded-md py-2 text-[0.78rem] transition-colors ${active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{children}</button>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>;
}

function priority(kind: string) {
  return kind === 'CONFIRMED' ? 0 : kind === 'HOLD' ? 1 : kind === 'MAINTENANCE' ? 2 : kind === 'OWNER_USE' ? 3 : 4;
}

function eventColor(kind: string) {
  return kind === 'CONFIRMED' ? 'bg-olive hover:bg-olive/90' : kind === 'HOLD' ? 'bg-gold hover:bg-gold/90' : kind === 'MAINTENANCE' ? 'bg-sky-700 hover:bg-sky-600' : kind === 'OWNER_USE' ? 'bg-violet-700 hover:bg-violet-600' : 'bg-stone-500 hover:bg-stone-400';
}
