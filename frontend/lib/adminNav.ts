/**
 * Admin menüsü tek kaynak. Hazır olmayan modüller `soon: true` ile
 * soluk ve tıklanamaz görünür — panelin nereye doğru büyüdüğü baştan belli olsun.
 */
export type NavItem = { label: string; href: string; icon: string; soon?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Panel',
    items: [{ label: 'Genel bakış', href: '/admin', icon: 'home' }],
  },
  {
    title: 'İçerik',
    items: [
      { label: 'Sayfalar', href: '/admin/pages', icon: 'pages' },
      { label: 'Footer & iletişim', href: '/admin/footer', icon: 'footer' },
    ],
  },
  {
    title: 'Envanter',
    items: [
      { label: 'Villalar', href: '/admin/villalar', icon: 'villa' },
      { label: 'Öne çıkanlar', href: '/admin/one-cikanlar', icon: 'sparkle' },
      { label: 'Bölgeler', href: '/admin/bolgeler', icon: 'pin' },
      { label: 'Konseptler', href: '/admin/konseptler', icon: 'sparkle' },
    ],
  },
  {
    title: 'Kişiler',
    items: [
      { label: 'Üyeler', href: '/admin/uyeler', icon: 'users' },
      { label: 'Ev sahibi başvuruları', href: '/admin/ev-sahipleri', icon: 'key' },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { label: 'Rezervasyonlar', href: '/admin/rezervasyonlar', icon: 'calendar', soon: true },
      { label: 'Ödeme ayarları', href: '/admin/odeme-ayarlari', icon: 'payment' },
    ],
  },
];

/** 1.3 kalınlıkta, 24'lük grid — site ikonlarıyla aynı dil. */
export const NAV_ICONS: Record<string, string> = {
  home: 'M3.5 10.5L12 4l8.5 6.5 M6 9.8V20h12V9.8',
  pages: 'M6 3.5h8l4 4V20a1 1 0 01-1 1H6a1 1 0 01-1-1V4.5a1 1 0 011-1z M14 3.5V8h4 M8.5 12.5h7 M8.5 16h4.5',
  footer: 'M3.5 5.5h17v13h-17z M3.5 14.5h17 M7 17.5h3',
  villa: 'M3.5 10.5L12 4l8.5 6.5 M6 9.8V20h12V9.8 M10 20v-5h4v5',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z M12 12.8a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z',
  users: 'M9 11.5a3.6 3.6 0 100-7.2 3.6 3.6 0 000 7.2z M2.8 20.2c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6 M16.5 5a3.4 3.4 0 010 6.6 M17.5 14.9c2.3.5 3.8 2.2 3.8 4.6',
  key: 'M15 8.5a4.5 4.5 0 11-4.4 5.5L4 20.5 3.5 17l1.9-.3.3-1.9 1.9-.3.3-1.9 2.7-2.7 M16.2 11.3h.01',
  calendar: 'M4.5 6.5h15v14h-15z M4.5 11h15 M8.5 3.5v4 M15.5 3.5v4',
  sparkle: 'M12 3l1.9 5.3L19 10.2l-5.1 1.9L12 17.4l-1.9-5.3L5 10.2l5.1-1.9L12 3z M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z',
  payment: 'M3.5 6.5h17v11h-17z M3.5 10h17 M7 14h4',
};
