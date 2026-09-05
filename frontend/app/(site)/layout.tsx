import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import WhatsAppButton from '@/components/site/WhatsAppButton';
import { getSetting } from '@/lib/api';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const footer = await getSetting('footer');

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer content={footer} />
      <WhatsAppButton config={footer.whatsapp} />
    </>
  );
}
