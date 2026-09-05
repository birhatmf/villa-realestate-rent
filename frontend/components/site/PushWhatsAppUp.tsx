'use client';

import { useEffect } from 'react';

/** Bu sayfada tam genişlik sabit bir alt çubuk (mobil fiyat çubuğu gibi) varken
 * WhatsApp balonunu onun üstüne taşır — yalnızca mobilde (bkz. globals.css). */
export default function PushWhatsAppUp() {
  useEffect(() => {
    document.documentElement.dataset.liftWhatsapp = 'true';
    return () => {
      delete document.documentElement.dataset.liftWhatsapp;
    };
  }, []);

  return null;
}
