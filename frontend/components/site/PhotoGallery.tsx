'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import FavoriteButton from './FavoriteButton';

type Img = { id: string; url: string };

export default function PhotoGallery({
  villaId,
  title,
  images,
}: {
  villaId: string;
  title: string;
  images: Img[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const visible = images.slice(0, 5);
  const extra = images.length - visible.length;

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(() => setOpen((i) => (i === null ? null : (i - 1 + images.length) % images.length)), [images.length]);
  const next = useCallback(() => setOpen((i) => (i === null ? null : (i + 1) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close, prev, next]);

  if (!images.length) return null;

  return (
    <>
      <div className="relative mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-2 px-6 sm:grid-cols-4 sm:grid-rows-2 lg:px-10">
        {visible.map((img, i) => {
          const isLast = i === visible.length - 1 && extra > 0;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${title} fotoğrafı ${i + 1}, büyütmek için tıklayın`}
              className={`group relative cursor-pointer overflow-hidden rounded-xl bg-sand-deep ${
                i === 0 ? 'col-span-2 row-span-2 aspect-square sm:aspect-auto' : 'aspect-square'
              }`}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes={i === 0 ? '(max-width: 768px) 100vw, 50vw' : '25vw'}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={i === 0}
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              {isLast && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-[0.95rem] text-white">
                  +{extra} fotoğraf
                </div>
              )}
            </button>
          );
        })}
        <FavoriteButton villaId={villaId} className="absolute right-4 top-4" />
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} fotoğrafları`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Kapat"
            autoFocus
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white"
          >
            ×
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Önceki fotoğraf"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white sm:left-5"
          >
            ‹
          </button>

          <div
            className="relative h-[80vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={images[open].url} alt="" fill sizes="90vw" className="object-contain" />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Sonraki fotoğraf"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white sm:right-5"
          >
            ›
          </button>

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[0.8rem] text-white/60">
            {open + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
