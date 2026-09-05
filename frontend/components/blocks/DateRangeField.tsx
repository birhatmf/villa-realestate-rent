'use client';

import { useEffect, useRef, useState } from 'react';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmt = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function DateRangeField() {
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => startOfDay(new Date()));
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(day: Date) {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(day);
      setCheckOut(null);
      setHover(null);
      return;
    }
    if (day <= checkIn) {
      setCheckIn(day);
      return;
    }
    setCheckOut(day);
    setOpen(false);
  }

  const rangeEnd = checkOut ?? hover;

  return (
    <div ref={ref} className="relative grid grid-cols-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col gap-1.5 border-r border-line/60 bg-surface px-6 py-4 text-left transition-colors hover:bg-sand/40"
      >
        <span className="eyebrow text-muted">Giriş</span>
        <span className="text-[0.95rem] text-ink">{checkIn ? fmt(checkIn) : 'Tarih seçin'}</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col gap-1.5 bg-surface px-6 py-4 text-left transition-colors hover:bg-sand/40"
      >
        <span className="eyebrow text-muted">Çıkış</span>
        <span className="text-[0.95rem] text-ink">{checkOut ? fmt(checkOut) : 'Tarih seçin'}</span>
      </button>

      <input type="hidden" name="from" value={checkIn ? isoDate(checkIn) : ''} />
      <input type="hidden" name="to" value={checkOut ? isoDate(checkOut) : ''} />

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-[min(90vw,640px)] rounded-2xl border border-line bg-canvas p-6 text-ink shadow-[0_24px_60px_-16px_rgba(0,0,0,0.35)]">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              aria-label="Önceki ay"
              onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
            >
              ‹
            </button>
            {checkIn && (
              <p className="text-[0.85rem] text-muted">
                {fmt(checkIn)}
                {rangeEnd ? ` – ${fmt(rangeEnd)}` : ' – çıkış seçin'}
              </p>
            )}
            <button
              type="button"
              aria-label="Sonraki ay"
              onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
            >
              ›
            </button>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <MonthGrid
              year={monthCursor.getFullYear()}
              month={monthCursor.getMonth()}
              checkIn={checkIn}
              rangeEnd={rangeEnd}
              onPick={pick}
              onHover={setHover}
            />
            <div className="hidden sm:block">
              <MonthGrid
                year={monthCursor.getFullYear()}
                month={monthCursor.getMonth() + 1}
                checkIn={checkIn}
                rangeEnd={rangeEnd}
                onPick={pick}
                onHover={setHover}
              />
            </div>
          </div>

          {(checkIn || checkOut) && (
            <button
              type="button"
              onClick={() => {
                setCheckIn(null);
                setCheckOut(null);
                setHover(null);
              }}
              className="mt-5 text-[0.85rem] text-muted underline underline-offset-4 transition-colors hover:text-ink"
            >
              Tarihleri temizle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MonthGrid({
  year,
  month,
  checkIn,
  rangeEnd,
  onPick,
  onHover,
}: {
  year: number;
  month: number;
  checkIn: Date | null;
  rangeEnd: Date | null;
  onPick: (d: Date) => void;
  onHover: (d: Date | null) => void;
}) {
  const first = new Date(year, month, 1);
  const leadingBlank = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = [
    ...Array(leadingBlank).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const rangeLo = checkIn && rangeEnd ? (checkIn < rangeEnd ? checkIn : rangeEnd) : null;
  const rangeHi = checkIn && rangeEnd ? (checkIn < rangeEnd ? rangeEnd : checkIn) : null;

  return (
    <div>
      <p className="text-center font-display text-[1.05rem] font-light text-ink">
        {first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[0.7rem] text-muted">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const past = d < today;
          const isStart = checkIn && d.getTime() === checkIn.getTime();
          const isEnd = rangeEnd && d.getTime() === rangeEnd.getTime();
          const inRange = rangeLo && rangeHi && d > rangeLo && d < rangeHi;
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => onPick(d)}
              onMouseEnter={() => onHover(d)}
              className={`relative flex h-8 items-center justify-center text-[0.82rem] transition-colors ${
                past
                  ? 'cursor-not-allowed text-muted/25'
                  : isStart || isEnd
                    ? 'rounded-full bg-ink text-canvas'
                    : inRange
                      ? 'bg-sand-deep text-ink'
                      : 'text-ink hover:bg-sand'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
