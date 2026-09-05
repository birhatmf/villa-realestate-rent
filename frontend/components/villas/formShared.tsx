'use client';

const inputCls =
  'mt-1.5 w-full border-b border-ink/25 bg-transparent pb-2 text-[0.94rem] text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-ink';

export function Section({ n, title, children, hint }: { n: string; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="mt-14 first:mt-0">
      <div className="flex items-baseline gap-3 border-b border-line pb-3.5">
        <span className="font-display text-lg text-gold">{n}</span>
        <h2 className="font-display text-2xl font-light tracking-[-0.01em] text-ink">{title}</h2>
      </div>
      {hint && <p className="mt-3 text-[0.85rem] text-muted">{hint}</p>}
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

export function Field({
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
      {hint && <span className="mt-1.5 block text-[0.76rem] text-muted/80">{hint}</span>}
    </label>
  );
}

export const Row = ({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) => (
  <div className={`grid gap-6 sm:grid-cols-${cols}`}>{children}</div>
);

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} resize-y`} />;
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
      />
      <span>
        <span className="block text-[0.9rem] text-ink">{label}</span>
        {hint && <span className="block text-[0.78rem] text-muted">{hint}</span>}
      </span>
    </label>
  );
}
