import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const REGIONS = [
  { slug: 'kas', name: 'Kaş', subtitle: 'Sakin koylar, taş evler', image: img('photo-1519046904884-53103b34b206', 1000) },
  { slug: 'kalkan', name: 'Kalkan', subtitle: 'Sonsuzluk havuzları', image: img('photo-1533105079780-92b9be482077', 1000) },
  { slug: 'bodrum', name: 'Bodrum', subtitle: 'Beyaz badana, bitmeyen yaz', image: img('photo-1570789210967-2cac24afeb00', 1000) },
  { slug: 'fethiye', name: 'Fethiye', subtitle: 'Çam ormanı ve deniz', image: img('photo-1520250497591-112f2f40a3f4', 1000) },
  { slug: 'cesme', name: 'Çeşme', subtitle: 'Rüzgâr ve turkuaz', image: img('photo-1493809842364-78817add7ffb', 1000) },
  { slug: 'antalya', name: 'Antalya', subtitle: 'Toroslar’ın eteğinde', image: img('photo-1571003123894-1f0594d2b5d9', 1000) },
  { slug: 'sapanca', name: 'Sapanca', subtitle: 'Göl kenarı bungalovlar', image: img('photo-1439066615861-d1af74d74000', 1000) },
  { slug: 'alacati', name: 'Alaçatı', subtitle: 'Arnavut kaldırımı sokaklar', image: img('photo-1540541338287-41700207dee6', 1000) },
];

const VILLAS = [
  { slug: 'villa-meltem', title: 'Villa Meltem', region: 'kas', district: 'Çukurbağ', price: 28500, cap: 8, bed: 4, bath: 3, rating: 4.9, reviews: 64,
    summary: 'Yarımadanın ucunda, denize sıfır terası ve korunaklı sonsuzluk havuzuyla.',
    images: ['photo-1613490493576-7fde63acd811', 'photo-1600607687939-ce8a6c25118c'] },
  { slug: 'villa-ada', title: 'Villa Ada', region: 'kalkan', district: 'Kışla', price: 34000, cap: 10, bed: 5, bath: 4, rating: 4.8, reviews: 41,
    summary: 'Kalkan limanına bakan üç teraslı taş villa; akşam güneşi tam salonun içine düşer.',
    images: ['photo-1582268611958-ebfd161ef9cf', 'photo-1611892440504-42a792e24d32'] },
  { slug: 'villa-zeytin', title: 'Villa Zeytin', region: 'bodrum', district: 'Yalıkavak', price: 42000, cap: 12, bed: 6, bath: 5, rating: 5.0, reviews: 28,
    summary: 'Yüz yıllık zeytinliğin içinde, taş ve ahşabın sakin dili.',
    images: ['photo-1512917774080-9991f1c4c750', 'photo-1600585154340-be6161a56a0c'] },
  { slug: 'villa-lima', title: 'Villa Lima', region: 'fethiye', district: 'Ölüdeniz', price: 19500, cap: 6, bed: 3, bath: 2, rating: 4.7, reviews: 87,
    summary: 'Çam kokulu bahçe, korunaklı havuz ve Babadağ manzarası.',
    images: ['photo-1600596542815-ffad4c1539a9', 'photo-1502005229762-cf1b2da7c5d6'] },
  { slug: 'villa-mavi', title: 'Villa Mavi', region: 'cesme', district: 'Alaçatı yolu', price: 26000, cap: 8, bed: 4, bath: 3, rating: 4.8, reviews: 53,
    summary: 'Beyaz kireç duvarlar, gölgeli avlu ve rüzgâra açık bir teras.',
    images: ['photo-1580587771525-78b9dba3b914', 'photo-1610641818989-c2051b5e2cfd'] },
  { slug: 'villa-defne', title: 'Villa Defne', region: 'antalya', district: 'Kaleiçi', price: 22000, cap: 7, bed: 4, bath: 3, rating: 4.6, reviews: 39,
    summary: 'Tarihî surların içinde restore edilmiş konak; şehrin ortasında tam sessizlik.',
    images: ['photo-1600607687939-ce8a6c25118c', 'photo-1613490493576-7fde63acd811'] },
  { slug: 'villa-gol', title: 'Villa Göl', region: 'sapanca', district: 'Kırkpınar', price: 16500, cap: 6, bed: 3, bath: 2, rating: 4.7, reviews: 112,
    summary: 'Kış aylarında da açık kapalı havuz, şömine ve göle bakan geniş balkon.',
    images: ['photo-1611892440504-42a792e24d32', 'photo-1512917774080-9991f1c4c750'] },
  { slug: 'villa-rüzgar', title: 'Villa Rüzgâr', region: 'alacati', district: 'Çark Plajı', price: 31000, cap: 9, bed: 5, bath: 4, rating: 4.9, reviews: 46,
    summary: 'Taş duvarlı bahçe, hasır gölgelik ve iki adım ötede kum.',
    images: ['photo-1502005229762-cf1b2da7c5d6', 'photo-1582268611958-ebfd161ef9cf'] },
];

const AMENITIES = ['Özel havuz', 'Deniz manzarası', 'Wi‑Fi', 'Klima', 'Barbekü', 'Otopark', 'Bulaşık makinesi', 'Jakuzi'];

const HOME_SECTIONS: { type: string; content: Prisma.InputJsonValue }[] = [
  {
    type: 'hero',
    content: {
      eyebrow: 'Türkiye’nin seçkin kiralık villaları',
      title: 'Kalabalıktan uzakta,\nyalnızca size ait bir yaz',
      subtitle:
        'Her villayı biz gezdik, biz fotoğrafladık. Listede yalnızca kendimizin kalacağı evler var.',
      slides: [
        { image: img('photo-1613490493576-7fde63acd811'), caption: 'Villa Meltem · Kaş' },
        { image: img('photo-1582268611958-ebfd161ef9cf'), caption: 'Villa Ada · Kalkan' },
        { image: img('photo-1512917774080-9991f1c4c750'), caption: 'Villa Zeytin · Bodrum' },
      ],
      search: { placeholder: 'Bölge veya villa adı', cta: 'Villa ara' },
    },
  },
  {
    type: 'statBar',
    content: {
      stats: [
        { value: '480+', label: 'Bizzat gezilmiş villa' },
        { value: '32', label: 'Bölge' },
        { value: '4.9', label: 'Ortalama misafir puanı' },
        { value: '%98', label: 'Tekrar konaklama' },
      ],
    },
  },
  {
    type: 'regionGrid',
    content: {
      eyebrow: 'Bölgeler',
      title: 'Nereye gitmek istersiniz?',
      limit: 8,
    },
  },
  {
    type: 'conceptGrid',
    content: {
      eyebrow: 'Konseptler',
      title: 'Size uygun konsepti keşfedin',
      limit: 4,
    },
  },
  {
    type: 'featuredVillas',
    content: {
      eyebrow: 'Seçkiler',
      title: 'Bu sezonun öne çıkanları',
      description: 'Editörlerimizin bu yaz için ayırdığı evler.',
      limit: 8,
      ctaLabel: 'Tüm villaları gör',
      ctaHref: '/villalar',
    },
  },
  {
    type: 'editorialSplit',
    content: {
      eyebrow: 'Nasıl çalışıyoruz',
      title: 'Katalog değil, kürasyon',
      body: 'Portföyümüze giren her ev için bir gece kalıyoruz. Suyun basıncını, akşam ışığının nereye düştüğünü, komşunun ne kadar yakın olduğunu biliyoruz. Beğenmediğimiz evi listeye almıyoruz — bu yüzden listemiz kısa.',
      image: img('photo-1600607687939-ce8a6c25118c', 1400),
      ctaLabel: 'Hikâyemiz',
      ctaHref: '/hakkimizda',
    },
  },
  {
    type: 'valueProps',
    content: {
      title: 'Rezervasyondan çıkışa kadar yanınızdayız',
      items: [
        { icon: 'shield', title: 'Güvenli ödeme', text: 'Ödemeniz giriş gününe kadar havuz hesapta tutulur.' },
        { icon: 'key', title: 'Karşılama servisi', text: 'Villada sizi bir ev sorumlusu karşılar, anahtarı elden teslim eder.' },
        { icon: 'clock', title: '7/24 destek', text: 'Konaklama boyunca tek bir numara; klimadan tekne turuna kadar.' },
        { icon: 'sparkle', title: 'Girişte temizlik', text: 'Her konaklama öncesi profesyonel temizlik ve çarşaf değişimi.' },
      ],
    },
  },
  {
    type: 'testimonials',
    content: {
      eyebrow: 'Misafirler',
      title: 'Dönüşte yazdıkları',
      items: [
        { quote: 'Fotoğraflar villayı olduğundan güzel göstermiyordu — tam tersi. Terasta geçirdiğimiz akşamlar için ayrı teşekkür.', author: 'Elif & Can', meta: 'Villa Meltem, Ağustos' },
        { quote: 'Üç aile birlikte kaldık, kimse birbirini rahatsız etmedi. Ev sorumlusu ilk gün pazara götürdü bizi.', author: 'Murat Aydın', meta: 'Villa Zeytin, Temmuz' },
        { quote: 'Havuz ısıtmalıydı, ekim ayında bile yüzdük. Rezervasyon tarafında hiç sürprizle karşılaşmadık.', author: 'Selin Demir', meta: 'Villa Göl, Ekim' },
      ],
    },
  },
  {
    type: 'ctaBanner',
    content: {
      eyebrow: 'Ev sahipleri için',
      title: 'Villanızı doğru misafirle buluşturalım',
      text: 'Portföyümüz seçkin olduğu için talep yüksek. Evinizi değerlendirelim, size doluluk ve fiyat öngörüsü çıkaralım.',
      image: img('photo-1600585154340-be6161a56a0c', 1600),
      primary: { label: 'Villanızı listeleyin', href: '/ev-sahibi' },
      secondary: { label: 'Bize ulaşın', href: '/iletisim' },
    },
  },
];

const FOOTER = {
  brand: {
    description:
      'Bizzat gezilmiş, kürasyonla seçilmiş kiralık villalar. Kısa bir liste, uzun bir tatil.',
  },
  newsletter: {
    enabled: true,
    title: 'Yeni villalardan ilk siz haberdar olun',
    text: 'Sezon açılışları ve erken rezervasyon fırsatları için ayda bir e‑posta.',
    placeholder: 'E‑posta adresiniz',
    cta: 'Kaydol',
  },
  columns: [
    {
      title: 'Keşfet',
      links: [
        { label: 'Tüm villalar', href: '/villalar' },
        { label: 'Denize sıfır', href: '/konseptler/denize-sifir' },
        { label: 'Balayı villaları', href: '/konseptler/balayi' },
        { label: 'Kış konaklaması', href: '/konseptler/kis' },
        { label: 'Korunaklı villalar', href: '/konseptler/korunakli' },
      ],
    },
    {
      title: 'Bölgeler',
      links: [
        { label: 'Kaş', href: '/bolgeler/kas' },
        { label: 'Kalkan', href: '/bolgeler/kalkan' },
        { label: 'Bodrum', href: '/bolgeler/bodrum' },
        { label: 'Fethiye', href: '/bolgeler/fethiye' },
        { label: 'Çeşme', href: '/bolgeler/cesme' },
      ],
    },
    {
      title: 'Kurumsal',
      links: [
        { label: 'Hakkımızda', href: '/hakkimizda' },
        { label: 'Villanızı listeleyin', href: '/ev-sahibi' },
        { label: 'Sıkça sorulanlar', href: '/sss' },
        { label: 'İptal koşulları', href: '/iptal-kosullari' },
        { label: 'İletişim', href: '/iletisim' },
      ],
    },
  ],
  contact: {
    title: 'İletişim',
    address: 'Kalamış Cad. No: 12/4, Kadıköy, İstanbul',
    phone: '0212 000 00 00',
    email: 'merhaba@villasepeti.com',
    mapUrl: 'https://maps.google.com/?q=Kadıköy+İstanbul',
    mapLabel: 'Haritada göster',
  },
  social: [
    { platform: 'instagram', url: 'https://instagram.com/' },
    { platform: 'facebook', url: 'https://facebook.com/' },
    { platform: 'youtube', url: 'https://youtube.com/' },
    { platform: 'x', url: 'https://x.com/' },
  ],
  whatsapp: {
    enabled: true,
    phone: '905000000000',
    message: 'Merhaba, villa kiralama hakkında bilgi almak istiyorum.',
    label: 'WhatsApp’tan yazın',
    position: 'right',
  },
  legal: [
    { label: 'KVKK Aydınlatma Metni', href: '/kvkk' },
    { label: 'Gizlilik Politikası', href: '/gizlilik' },
    { label: 'Çerez Politikası', href: '/cerez-politikasi' },
    { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' },
  ],
  copyright: '© {year} Villa Sepeti. Tüm hakları saklıdır.',
};

const CONCEPTS = [
  {
    slug: 'denize-sifir',
    name: 'Denize Sıfır',
    subtitle: 'Kumsala birkaç adım',
    description: 'Plaja yürüme mesafesindeki villalar — sabah kahvesini kumda içmek isteyenler için.',
    image: img('photo-1571003123894-1f0594d2b5d9', 1400),
  },
  {
    slug: 'balayi',
    name: 'Balayı Villaları',
    subtitle: 'Yalnızca ikiniz için',
    description: 'Mahremiyeti yüksek, romantik detaylarla donatılmış villalar.',
    image: img('photo-1611892440504-42a792e24d32', 1400),
  },
  {
    slug: 'kis',
    name: 'Kış Konaklaması',
    subtitle: 'Şömine ve sıcak havuz',
    description: 'Kapalı/ısıtmalı havuzu, şöminesi olan; kış aylarında da konaklanabilen villalar.',
    image: img('photo-1439066615861-d1af74d74000', 1400),
  },
  {
    slug: 'korunakli',
    name: 'Korunaklı Villalar',
    subtitle: 'Dışarıdan görünmeyen',
    description: 'Havuz terası ve bahçesi çevre duvarlarla kapalı, tam mahremiyet sunan villalar.',
    image: img('photo-1600585154340-be6161a56a0c', 1400),
  },
];

async function main() {
  await prisma.setting.upsert({
    where: { key: 'footer' },
    update: {},
    create: { key: 'footer', value: FOOTER },
  });

  const email = process.env.ADMIN_EMAIL ?? 'admin@villasepeti.com';
  await prisma.user.upsert({
    where: { email },
    // update'te de rol var: var olan admin kaydı GUEST'e düşmesin.
    update: { role: 'ADMIN', active: true },
    create: {
      email,
      name: 'Yönetici',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'admin1234', 10),
    },
  });

  await prisma.villa.deleteMany();
  await prisma.region.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.section.deleteMany();
  await prisma.page.deleteMany();

  const regionIds = new Map<string, string>();
  for (const [i, r] of REGIONS.entries()) {
    const created = await prisma.region.create({ data: { ...r, order: i } });
    regionIds.set(r.slug, created.id);
  }

  const conceptIds: string[] = [];
  for (const [i, c] of CONCEPTS.entries()) {
    const created = await prisma.concept.create({ data: { ...c, order: i } });
    conceptIds.push(created.id);
  }

  const BUILDING_TYPES = ['DETACHED', 'DETACHED', 'STONE_HOUSE', 'BUNGALOW'] as const;

  for (const [i, v] of VILLAS.entries()) {
    await prisma.villa.create({
      data: {
        slug: v.slug,
        title: v.title,
        summary: v.summary,
        regionId: regionIds.get(v.region)!,
        district: v.district,
        status: 'PUBLISHED',
        buildingType: BUILDING_TYPES[i % BUILDING_TYPES.length],
        maxAdults: v.cap,
        maxChildren: 0,
        capacity: v.cap,
        bedrooms: v.bed,
        bathrooms: v.bath,
        poolType: 'PRIVATE',
        poolSecluded: i % 2 === 0,
        poolHeated: i % 3 === 0,
        pricePerNight: v.price,
        depositAmount: Math.round(v.price * 1.5),
        amenities: AMENITIES.slice(0, 4 + (i % 4)),
        rating: v.rating,
        reviewCount: v.reviews,
        featured: true,
        featuredOrder: i,
        images: {
          create: v.images.map((id, k) => ({
            url: img(id, 1200),
            category: k === 0 ? 'EXTERIOR_VIEW' : 'POOL_GARDEN',
            order: k,
            isCover: k === 0,
          })),
        },
        concepts: { connect: [{ id: conceptIds[i % conceptIds.length] }] },
      },
    });
  }

  await prisma.page.create({
    data: {
      slug: 'home',
      title: 'Ana Sayfa',
      seoTitle: 'Kiralık Villa · Denize Sıfır Özel Havuzlu Villalar',
      seoDescription:
        'Kaş, Kalkan, Bodrum, Fethiye ve daha fazlasında bizzat gezilmiş, özel havuzlu kiralık villalar.',
      sections: {
        create: HOME_SECTIONS.map((s, order) => ({ ...s, order })),
      },
    },
  });

  console.log(`✓ ${REGIONS.length} bölge, ${CONCEPTS.length} konsept, ${VILLAS.length} villa, ${HOME_SECTIONS.length} blok yüklendi.`);
}

main().finally(() => prisma.$disconnect());
