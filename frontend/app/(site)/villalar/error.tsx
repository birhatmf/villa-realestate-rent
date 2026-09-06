'use client';

export default function VillaListingError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-3xl px-6 pt-40 pb-24 text-center">
      <h1 className="font-display text-3xl">Villalar şu anda yüklenemedi.</h1>
      <p className="mt-4 text-muted">Lütfen biraz sonra yeniden deneyin.</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-ink px-6 py-3 text-canvas">Yeniden dene</button>
    </div>
  );
}
