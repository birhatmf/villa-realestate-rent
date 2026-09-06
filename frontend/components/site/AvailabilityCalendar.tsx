'use client';

import { useEffect, useState } from 'react';

type Range = { startDate: string; endDate: string };
type Result = { available: boolean; nights: number; minimumNights: number; reasons: string[] };

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const DAY = 86_400_000;
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const REASON: Record<string, string> = {
  SALES_PAUSED: 'Bu villa şu anda rezervasyona kapalı.',
  DATES_UNAVAILABLE: 'Seçilen aralıkta dolu geceler var.',
  MIN_STAY: 'Seçilen tarihler minimum konaklama süresini karşılamıyor.',
  CHECKIN_DAY: 'Bu tarihte giriş yapılamıyor.',
  CAPACITY_EXCEEDED: 'Misafir sayısı villa kapasitesini aşıyor.',
};

const iso = (date: Date) => date.toISOString().slice(0, 10);
const parse = (value: string) => new Date(`${value}T00:00:00.000Z`);
const addMonths = (date: Date, count: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));

function overlaps(from: string, to: string, ranges: Range[]) {
  return ranges.some((range) => from < range.endDate.slice(0, 10) && to > range.startDate.slice(0, 10));
}

export default function AvailabilityCalendar({
  slug,
  blockedDates,
  maxAdults,
  maxChildren,
  maxInfants,
}: {
  slug: string;
  blockedDates: Range[];
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
}) {
  const now = new Date();
  const today = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  const [month, setMonth] = useState(() => new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [guests, setGuests] = useState({ adults: Math.min(2, maxAdults), children: 0, infants: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) { setResult(null); return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ from, to, ...Object.fromEntries(Object.entries(guests).map(([key, value]) => [key, String(value)])) });
    setChecking(true);
    setError(null);
    fetch(`${API}/villas/${encodeURIComponent(slug)}/availability?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Müsaitlik kontrol edilemedi.');
        return response.json() as Promise<Result>;
      })
      .then(setResult)
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [from, to, guests, slug]);

  function choose(date: string) {
    if (date < today) return;
    const blocked = overlaps(date, iso(new Date(parse(date).getTime() + DAY)), blockedDates);
    if (!from || to || date <= from) {
      if (blocked) return;
      setFrom(date);
      setTo('');
      setResult(null);
      return;
    }
    if (overlaps(from, date, blockedDates)) {
      if (!blocked) setFrom(date);
      setTo('');
      return;
    }
    setTo(date);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.82rem] text-muted">Giriş ve çıkış gününü seçin.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Önceki ay" className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:border-ink hover:text-ink">‹</button>
          <button type="button" onClick={() => setMonth(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)))} className="text-[0.76rem] text-muted hover:text-ink">Bugün</button>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Sonraki ay" className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:border-ink hover:text-ink">›</button>
        </div>
      </div>

      <div className="grid gap-10 sm:grid-cols-2">
        <Month month={month} ranges={blockedDates} today={today} from={from} to={to} onChoose={choose} />
        <Month month={addMonths(month, 1)} ranges={blockedDates} today={today} from={from} to={to} onChoose={choose} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.76rem] text-muted">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-sand-deep" /> Dolu</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-olive" /> Seçili geceler</span>
        <span>Çıkış günü başka bir misafirin giriş günü olabilir.</span>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-sand/40 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid grid-cols-2 gap-2">
            <DateSummary label="Giriş" value={from} />
            <DateSummary label="Çıkış" value={to} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <GuestInput label="Yetişkin" value={guests.adults} max={maxAdults} min={1} onChange={(adults) => setGuests({ ...guests, adults })} />
            <GuestInput label="Çocuk" value={guests.children} max={maxChildren} onChange={(children) => setGuests({ ...guests, children })} />
            <GuestInput label="Bebek" value={guests.infants} max={maxInfants} onChange={(infants) => setGuests({ ...guests, infants })} />
          </div>
          {result?.available && <a href={`/iletisim?from=${from}&to=${to}&villa=${encodeURIComponent(slug)}`} className="rounded-full bg-ink px-5 py-3 text-center text-[0.82rem] text-canvas hover:bg-olive">Rezervasyon talebi</a>}
        </div>
        {checking && <p className="mt-3 text-[0.8rem] text-muted">Tarihler kontrol ediliyor…</p>}
        {error && <p role="alert" className="mt-3 text-[0.8rem] text-red-700">{error}</p>}
        {result && !checking && <p className={`mt-3 text-[0.82rem] ${result.available ? 'text-olive' : 'text-red-700'}`}>
          {result.available ? `${result.nights} gece için müsait.` : result.reasons.map((reason) => REASON[reason] ?? reason).join(' ')}
        </p>}
      </div>
    </div>
  );
}

function Month({ month, ranges, today, from, to, onChoose }: { month: Date; ranges: Range[]; today: string; from: string; to: string; onChoose: (date: string) => void }) {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const leading = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index + 1)))];
  return <div>
    <p className="text-center font-display text-lg font-light capitalize text-ink">{first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
    <div className="mt-4 grid grid-cols-7 gap-1 text-center">
      {WEEKDAYS.map((weekday) => <span key={weekday} className="pb-1 text-[0.68rem] text-muted">{weekday}</span>)}
      {cells.map((day, index) => {
        if (!day) return <span key={`blank-${index}`} />;
        const date = iso(day);
        const past = date < today;
        const blocked = overlaps(date, iso(new Date(day.getTime() + DAY)), ranges);
        const selectedNight = Boolean(from && (to ? date >= from && date < to : date === from));
        const endpoint = date === from || date === to;
        const canCheckout = Boolean(from && !to && date > from && !overlaps(from, date, ranges));
        const disabled = past || (blocked && !canCheckout);
        return <button
          type="button"
          key={date}
          disabled={disabled}
          onClick={() => onChoose(date)}
          aria-label={`${date}${blocked ? ', dolu' : ''}${endpoint ? ', seçili' : ''}`}
          className={`flex h-9 items-center justify-center rounded-md text-[0.8rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${endpoint ? 'bg-ink text-white ring-2 ring-ink' : selectedNight ? 'bg-olive text-white' : blocked ? 'bg-sand-deep text-muted/60 line-through' : past ? 'text-muted/25' : 'text-ink hover:bg-sand'} disabled:cursor-not-allowed`}
        >{day.getUTCDate()}</button>;
      })}
    </div>
  </div>;
}

function DateSummary({ label, value }: { label: string; value: string }) {
  return <div><p className="eyebrow text-muted">{label}</p><p className="mt-1 text-[0.84rem] text-ink">{value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'Tarih seçin'}</p></div>;
}

function GuestInput({ label, value, max, min = 0, onChange }: { label: string; value: number; max: number; min?: number; onChange: (value: number) => void }) {
  return <label className="text-[0.67rem] text-muted">{label}<input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-2 text-[0.8rem] text-ink outline-none focus:border-olive" /></label>;
}
