type Range = { startDate: string; endDate: string };

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Yarı açık aralık [startDate, endDate) — çıkış günü (endDate) müsait sayılır,
 * bir sonraki misafir aynı gün giriş yapabilir. */
function isBlocked(day: Date, ranges: Range[]) {
  const t = day.getTime();
  return ranges.some((r) => {
    const start = startOfDay(new Date(r.startDate)).getTime();
    const end = startOfDay(new Date(r.endDate)).getTime();
    return t >= start && t < end;
  });
}

function Month({ year, month, ranges }: { year: number; month: number; ranges: Range[] }) {
  const first = new Date(year, month, 1);
  // Pazartesi başlangıçlı ızgara için offset (JS: 0=Pazar).
  const leadingBlank = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = [
    ...Array(leadingBlank).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div>
      <p className="text-center font-display text-lg font-light text-ink">
        {first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[0.72rem] text-muted">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const past = d < today;
          const blocked = !past && isBlocked(d, ranges);
          return (
            <span
              key={i}
              className={`flex h-8 items-center justify-center rounded-md text-[0.82rem] ${
                past
                  ? 'text-muted/30'
                  : blocked
                    ? 'bg-sand-deep text-muted/60 line-through'
                    : 'text-ink'
              }`}
            >
              {d.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function AvailabilityCalendar({ blockedDates }: { blockedDates: Range[] }) {
  const now = new Date();
  return (
    <div>
      <div className="grid gap-10 sm:grid-cols-2">
        <Month year={now.getFullYear()} month={now.getMonth()} ranges={blockedDates} />
        <Month year={now.getFullYear()} month={now.getMonth() + 1} ranges={blockedDates} />
      </div>
      <p className="mt-5 flex items-center gap-2 text-[0.8rem] text-muted">
        <span className="inline-block h-3 w-3 rounded-sm bg-sand-deep" /> Dolu
        <span className="ml-3 text-muted/70">Çıkış günü aynı gün yeni girişe açıktır.</span>
      </p>
    </div>
  );
}
