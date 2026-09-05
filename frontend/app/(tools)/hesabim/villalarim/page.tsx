'use client';

import { Suspense } from 'react';
import VillasTable from '@/components/villas/VillasTable';

export default function HostVillalarimPage() {
  return (
    <Suspense>
      <VillasTable
        scope="host"
        title="Villalarım"
        newHref="/hesabim/villalarim/yeni"
        editHref={(id) => `/hesabim/villalarim/${id}`}
      />
    </Suspense>
  );
}
