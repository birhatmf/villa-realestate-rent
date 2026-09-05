'use client';

import { useEffect } from 'react';

/** Tek bir IntersectionObserver ile tüm `.reveal` öğelerini görünür yapar. */
export default function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('reveal-in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );

    const scan = () =>
      document
        .querySelectorAll('.reveal:not(.reveal-in)')
        .forEach((el) => io.observe(el));

    scan();
    // Sonradan mount olan bloklar (admin inline editör) için de yakala.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
