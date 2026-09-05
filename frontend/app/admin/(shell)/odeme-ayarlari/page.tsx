'use client';

import { useEffect, useRef, useState } from 'react';
import { getSetting, saveSetting } from '@/lib/adminApi';

export default function PaymentSettingsPage() {
  const [rate, setRate] = useState<number | ''>('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting('payments')
      .then((v) => setRate(typeof v.defaultCommissionRate === 'number' ? v.defaultCommissionRate : 20))
      .catch((e) => setError(e.message));
  }, []);

  const saveRef = useRef<() => void>(() => {});
  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveSetting('payments', { defaultCommissionRate: rate === '' ? 20 : rate });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }
  saveRef.current = save;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-8 py-14">
        <p className="eyebrow text-gold">Operasyon</p>
        <h1 className="mt-3 font-display text-3xl font-light tracking-[-0.02em] text-ink">
          Ödeme ayarları
        </h1>
        <p className="mt-4 text-[0.9rem] leading-relaxed text-muted">
          Villa bazlı komisyon oranı boş bırakıldığında bu genel varsayılan kullanılır. Gerçek ödeme
          bölüştürme ve ev sahibine otomatik transfer, rezervasyon modülüyle birlikte gelecek —
          burası yalnızca oranı belirler.
        </p>

        <label className="mt-10 block max-w-xs">
          <span className="eyebrow text-muted">Genel varsayılan komisyon oranı (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={rate}
            onChange={(e) => {
              setRate(e.target.value === '' ? '' : Number(e.target.value));
              setDirty(true);
            }}
            className="mt-1.5 w-full border-b border-ink/25 bg-transparent pb-2 text-[0.98rem] text-ink outline-none focus:border-ink"
          />
        </label>

        {error && <p className="mt-6 text-[0.88rem] text-red-700">{error}</p>}

        <button
          onClick={save}
          disabled={!dirty || saving}
          className="mt-8 rounded-full bg-ink px-6 py-2.5 text-[0.85rem] text-canvas transition-colors hover:bg-olive disabled:opacity-35"
        >
          {saving ? 'Kaydediliyor…' : saved ? 'Kaydedildi' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}
