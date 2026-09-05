'use client';

import type { Field } from '@/lib/blockSchema';

const inputCls =
  'mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-olive-soft';

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (next: any) => void;
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <Label field={field}>
          <textarea
            rows={4}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} resize-y leading-relaxed`}
          />
        </Label>
      );

    case 'number':
      return (
        <Label field={field}>
          <input
            type="number"
            min={field.min}
            max={field.max}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className={inputCls}
          />
        </Label>
      );

    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-2.5 py-1">
          <input
            type="checkbox"
            checked={value !== false}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-olive"
          />
          <span className="text-[0.88rem] text-ink">{field.label}</span>
          {field.hint && <span className="text-[0.75rem] text-muted">· {field.hint}</span>}
        </label>
      );

    case 'select':
      return (
        <Label field={field}>
          <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Label>
      );

    case 'image':
      return (
        <Label field={field}>
          <input
            type="url"
            value={value ?? ''}
            placeholder="https://…"
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="mt-2 h-24 w-full rounded-md border border-line object-cover"
            />
          )}
        </Label>
      );

    case 'group':
      return (
        <fieldset className="rounded-lg border border-line/80 bg-sand/25 p-3">
          <legend className="eyebrow px-1 text-muted">{field.label}</legend>
          <div className="space-y-3">
            {field.fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={value?.[f.key]}
                onChange={(v) => onChange({ ...(value ?? {}), [f.key]: v })}
              />
            ))}
          </div>
        </fieldset>
      );

    case 'list': {
      const items: any[] = Array.isArray(value) ? value : [];
      const replace = (next: any[]) => onChange(next);

      return (
        <div>
          <div className="flex items-center justify-between">
            <span className="eyebrow text-muted">{field.label}</span>
            <button
              type="button"
              onClick={() => replace([...items, { ...field.defaultItem }])}
              className="text-[0.78rem] text-olive transition-colors hover:text-ink"
            >
              + {field.itemLabel} ekle
            </button>
          </div>

          <div className="mt-2 space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-line/80 bg-sand/25 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[0.75rem] text-muted">
                    {field.itemLabel} {i + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <IconBtn
                      label="Yukarı taşı"
                      disabled={i === 0}
                      onClick={() => replace(swap(items, i, i - 1))}
                    >
                      ↑
                    </IconBtn>
                    <IconBtn
                      label="Aşağı taşı"
                      disabled={i === items.length - 1}
                      onClick={() => replace(swap(items, i, i + 1))}
                    >
                      ↓
                    </IconBtn>
                    <IconBtn
                      label="Sil"
                      onClick={() => replace(items.filter((_, k) => k !== i))}
                    >
                      ×
                    </IconBtn>
                  </div>
                </div>

                <div className="space-y-3">
                  {field.fields.map((f) => (
                    <FieldInput
                      key={f.key}
                      field={f}
                      value={item?.[f.key]}
                      onChange={(v) =>
                        replace(items.map((it, k) => (k === i ? { ...it, [f.key]: v } : it)))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            {!items.length && (
              <p className="rounded-lg border border-dashed border-line py-4 text-center text-[0.82rem] text-muted">
                Henüz {field.itemLabel.toLowerCase()} yok.
              </p>
            )}
          </div>
        </div>
      );
    }

    default:
      return (
        <Label field={field}>
          <input
            type="text"
            value={value ?? ''}
            placeholder={'placeholder' in field ? field.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </Label>
      );
  }
}

function Label({ field, children }: { field: Field; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow text-muted">{field.label}</span>
      {children}
      {'hint' in field && field.hint && (
        <span className="mt-1 block text-[0.75rem] text-muted/80">{field.hint}</span>
      )}
    </label>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-sand-deep hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const swap = <T,>(arr: T[], a: number, b: number) => {
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};
