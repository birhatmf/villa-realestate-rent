import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import Reveal from '@/components/site/Reveal';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Villa Kiralama',
  description: 'Bizzat gezilmiş, özel havuzlu kiralık villalar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {children}
        <Reveal />
      </body>
    </html>
  );
}
