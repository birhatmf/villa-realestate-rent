import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatPrice, getVillaBySlug } from '@/lib/api';
import MinistryBadge from '@/components/site/MinistryBadge';
import PhotoGallery from '@/components/site/PhotoGallery';
import PushWhatsAppUp from '@/components/site/PushWhatsAppUp';
import AvailabilityCalendar from '@/components/site/AvailabilityCalendar';
import {
  BED_TYPE_LABEL,
  BUILDING_TYPE_LABEL,
  IMAGE_CATEGORY_LABEL,
  PET_POLICY_LABEL,
  POOL_TYPE_LABEL,
  VIEW_TAGS,
  WEEKDAYS,
} from '@/lib/villaSchema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const villa = await getVillaBySlug(slug);
  if (!villa) return {};
  return {
    title: `${villa.title} · ${villa.region.name}`,
    description: villa.summary ?? undefined,
  };
}

export default async function VillaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const villa = await getVillaBySlug(slug);
  if (!villa) notFound();

  const orderedImages = (() => {
    const cover = villa.images.find((i) => i.isCover) ?? villa.images[0];
    if (!cover) return villa.images;
    return [cover, ...villa.images.filter((i) => i.id !== cover.id)];
  })();

  const included: string[] = [];
  const excluded: string[] = [];
  (villa.utilitiesIncluded ? included : excluded).push('Elektrik ve su');
  (villa.gasIncluded ? included : excluded).push('Tüpgaz');
  if (villa.poolType !== 'NONE' && villa.poolHeated) {
    (villa.poolHeatingIncluded ? included : excluded).push('Havuz ısıtması');
  }

  const distanceBadges: string[] = [];
  if (villa.beachDistanceM) distanceBadges.push(`Plaja yaklaşık ${villa.beachDistanceM} m`);
  if (villa.nearCenter) distanceBadges.push('Merkeze yakın (~3 km çevresinde)');
  if (villa.viewTags.length) {
    distanceBadges.push(...villa.viewTags.map((t) => VIEW_TAGS.find((v) => v.value === t)?.label ?? t));
  }

  return (
    <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-32 lg:pb-28">
      <PushWhatsAppUp />
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <p className="eyebrow text-gold">
          {villa.region.name}
          {villa.district ? ` · ${villa.district}` : ''}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-light leading-[1.08] tracking-[-0.02em] text-ink">
            {villa.title}
          </h1>
          <div className="flex items-center gap-3">
            {villa.rating > 0 && (
              <span className="rounded-full bg-sand px-3 py-1.5 text-[0.85rem] text-ink">
                ★ {villa.rating.toFixed(1)} <span className="text-muted">· {villa.reviewCount} yorum</span>
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-[0.95rem] text-muted">
          {BUILDING_TYPE_LABEL[villa.buildingType]} · {villa.bedrooms} yatak odası · {villa.bathrooms} banyo ·{' '}
          {villa.maxAdults + villa.maxChildren} kişi
        </p>
        {villa.summary && <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-muted">{villa.summary}</p>}
      </div>

      <PhotoGallery villaId={villa.id} title={villa.title} images={orderedImages} />

      <div className="mx-auto mt-16 max-w-5xl px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1fr_360px]">
          <div className="space-y-14">
            <Section title="Kapasite ve Odalar">
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                <Stat label="Yetişkin" value={villa.maxAdults} />
                <Stat label="Çocuk" value={villa.maxChildren} />
                <Stat label="Bebek" value={villa.maxInfants} />
                <Stat label="Yatak odası" value={villa.bedrooms} />
                <Stat label="Banyo" value={villa.bathrooms} />
              </div>
              {villa.rooms.length > 0 && (
                <div className="mt-6 space-y-2.5">
                  {villa.rooms.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                      <span className="text-[0.9rem] text-ink">
                        {i + 1}. Yatak Odası · {BED_TYPE_LABEL[r.bedType]} × {r.bedCount}
                      </span>
                      <span className="flex gap-2 text-[0.8rem] text-muted">
                        {r.hasEnsuite && <span>Ebeveyn banyosu</span>}
                        {r.hasJacuzzi && <span>Jakuzi</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Konsept ve Nitelikler">
              <div className="flex flex-wrap gap-2">
                {villa.poolType !== 'NONE' && (
                  <Chip>
                    {POOL_TYPE_LABEL[villa.poolType]}
                    {villa.poolSecluded ? ' · Korunaklı' : ''}
                    {villa.poolHeated ? ' · Isıtmalı' : ''}
                  </Chip>
                )}
                {villa.wifiMbps && <Chip>Wi‑Fi {villa.wifiMbps} Mbps</Chip>}
                {distanceBadges.map((b) => (
                  <Chip key={b}>{b}</Chip>
                ))}
                {villa.amenities.map((a) => (
                  <Chip key={a}>{a}</Chip>
                ))}
              </div>
              {villa.videoUrl && (
                <a
                  href={villa.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-[0.9rem] text-ink underline underline-offset-4 hover:text-gold"
                >
                  Video turu izleyin ↗
                </a>
              )}
            </Section>

            <Section title="Kurallar">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-[0.9rem]">
                <Rule label="Evcil hayvan" value={PET_POLICY_LABEL[villa.petPolicy]} />
                <Rule label="Giriş saati" value={villa.checkInTime} />
                <Rule label="Çıkış saati" value={villa.checkOutTime} />
                {villa.checkInWeekday !== null && villa.checkInWeekday !== undefined && (
                  <Rule label="Giriş günü" value={`Yalnızca ${WEEKDAYS[villa.checkInWeekday]}`} />
                )}
                <Rule label="Parti / etkinlik" value={villa.eventsAllowed ? 'İzin var' : 'İzin yok'} />
                <Rule label="Sigara (kapalı alan)" value={villa.smokingAllowed ? 'İzin var' : 'İzin yok'} />
                {villa.familiesOnly && <Rule label="Grup kısıtı" value="Yalnızca ailelere uygun" />}
                {!villa.allowSingleMaleGroups && <Rule label="" value="Bekar erkek gruplarına kiralanmaz" />}
                {!villa.allowYoungGroups && <Rule label="" value="Genç arkadaş gruplarına uygun değil" />}
              </dl>
              {villa.customRules.length > 0 && (
                <ul className="mt-5 space-y-2 border-t border-line pt-5 text-[0.9rem] text-ink-soft">
                  {villa.customRules.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Müsaitlik Takvimi">
              <AvailabilityCalendar blockedDates={villa.blockedDates} />
            </Section>
          </div>

          {/* Sağ sütun: fiyat kartı */}
          <aside className="h-fit space-y-6 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-28">
            <div>
              <p className="eyebrow text-muted">Gecelik fiyat</p>
              <p className="mt-1.5 font-display text-2xl text-ink">
                {villa.priceRange.min === villa.priceRange.max
                  ? formatPrice(villa.priceRange.min, villa.currency)
                  : `${formatPrice(villa.priceRange.min, villa.currency)} – ${formatPrice(villa.priceRange.max, villa.currency)}`}
              </p>
              <p className="text-[0.8rem] text-muted">Sezona göre değişir</p>
            </div>

            <div className="border-t border-line pt-5 text-[0.85rem] text-muted">
              <p>Minimum konaklama: {villa.minNights} gece</p>
              <p className="mt-1">Hasar depozitosu: {formatPrice(villa.depositAmount, villa.currency)}</p>
              <p className="mt-1">
                Temizlik ücreti ({formatPrice(villa.cleaningFee, villa.currency)}): yalnızca {villa.cleaningFeeThresholdNights} geceden
                kısa konaklamalarda uygulanır.
              </p>
            </div>

            {(included.length > 0 || excluded.length > 0) && (
              <div className="border-t border-line pt-5">
                <p className="eyebrow text-muted">Fiyata dahil</p>
                <ul className="mt-2 space-y-1 text-[0.85rem] text-ink">
                  {included.map((i) => (
                    <li key={i}>✓ {i}</li>
                  ))}
                </ul>
                {excluded.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[0.85rem] text-muted">
                    {excluded.map((i) => (
                      <li key={i}>✕ {i} (hariç)</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <a
              href="/iletisim"
              className="block rounded-full bg-ink py-3 text-center text-[0.9rem] text-canvas transition-colors hover:bg-olive"
            >
              Bilgi ve rezervasyon
            </a>
          </aside>
        </div>

        <div className="mt-16">
          <MinistryBadge permitNumber={villa.permitNumber ?? null} />
        </div>
      </div>

      {/* Mobilde fiyat kartı içerik sonunda kalıyordu — bu, tüm gezinme boyunca görünür kalır. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-surface/95 px-5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-sm lg:hidden">
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-ink">
            {villa.priceRange.min === villa.priceRange.max
              ? formatPrice(villa.priceRange.min, villa.currency)
              : `${formatPrice(villa.priceRange.min, villa.currency)}+`}
          </p>
          <p className="text-[0.76rem] text-muted">/ gece</p>
        </div>
        <a
          href="/iletisim"
          className="shrink-0 rounded-full bg-ink px-6 py-3 text-[0.88rem] text-canvas transition-colors hover:bg-olive"
        >
          Bilgi ve rezervasyon
        </a>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-line pb-3.5 font-display text-2xl font-light tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-light text-ink">{value}</p>
      <p className="mt-1 text-[0.78rem] text-muted">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line px-3.5 py-1.5 text-[0.82rem] text-ink-soft">{children}</span>;
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div>
      {label && <dt className="text-muted">{label}</dt>}
      <dd className={label ? 'mt-0.5 text-ink' : 'text-ink'}>{value}</dd>
    </div>
  );
}
