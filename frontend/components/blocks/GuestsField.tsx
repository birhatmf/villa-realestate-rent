'use client';

import { useEffect, useRef, useState } from 'react';

export default function GuestsField({ className = '', defaultAdults = 2, defaultChildren = 0, defaultInfants = 0 }: {
  className?: string;
  defaultAdults?: number;
  defaultChildren?: number;
  defaultInfants?: number;
}) {
  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(defaultAdults);
  const [children, setChildren] = useState(defaultChildren);
  const [infants, setInfants] = useState(defaultInfants);
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

  const summary = [
    `${adults} yetişkin`,
    children > 0 ? `${children} çocuk` : '',
    infants > 0 ? `${infants} bebek` : '',
  ].filter(Boolean).join(', ');

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-col gap-1.5 bg-surface px-6 py-4 text-left transition-colors hover:bg-sand/40"
      >
        <span className="eyebrow text-muted">Misafir</span>
        <span className="truncate text-[0.95rem] text-ink">{summary}</span>
      </button>

      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />
      <input type="hidden" name="infants" value={infants} />

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(90vw,18rem)] rounded-2xl border border-line bg-canvas p-5 text-ink shadow-[0_24px_60px_-16px_rgba(0,0,0,0.35)]">
          <Counter label="Yetişkin" hint="13 yaş ve üzeri" value={adults} min={1} max={20} onChange={setAdults} />
          <div className="my-4 h-px bg-line" />
          <Counter label="Çocuk" hint="0–12 yaş" value={children} min={0} max={12} onChange={setChildren} />
          <div className="my-4 h-px bg-line" />
          <Counter label="Bebek" hint="0–2 yaş" value={infants} min={0} max={10} onChange={setInfants} />
        </div>
      )}
    </div>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[0.92rem] text-ink">{label}</p>
        <p className="text-[0.78rem] text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label} azalt`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink disabled:pointer-events-none disabled:opacity-30"
        >
          −
        </button>
        <span className="w-4 text-center text-[0.92rem] tabular-nums text-ink">{value}</span>
        <button
          type="button"
          aria-label={`${label} artır`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink disabled:pointer-events-none disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
