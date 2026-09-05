'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { readSession } from '@/lib/session';
import { getSnapshot, load, subscribe, toggle } from '@/lib/favoritesStore';

export default function FavoriteButton({
  villaId,
  className = '',
}: {
  villaId: string;
  className?: string;
}) {
  const router = useRouter();
  const active = useSyncExternalStore(
    subscribe,
    () => getSnapshot(villaId),
    () => false,
  );

  useEffect(() => {
    if (readSession()) load();
  }, []);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!readSession()) {
      router.push('/giris?next=/hesabim');
      return;
    }
    toggle(villaId);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-canvas/90 backdrop-blur-sm transition-transform hover:scale-105 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={active ? '#a8834e' : 'none'}
        stroke={active ? '#a8834e' : 'currentColor'}
        strokeWidth="1.6"
        aria-hidden
        className={`h-[1.05rem] w-[1.05rem] ${active ? '' : 'text-ink'}`}
      >
        <path d="M12 20.5s-7.5-4.6-10-9.3C0.4 8 1.7 4.5 5 3.6c2.2-.6 4.3.4 6 2.7 1.7-2.3 3.8-3.3 6-2.7 3.3.9 4.6 4.4 3 7.6-2.5 4.7-10 9.3-10 9.3z" />
      </svg>
    </button>
  );
}
