'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VillasTable from '@/components/villas/VillasTable';

function Inner() {
  const params = useSearchParams();
  return (
    <VillasTable
      scope="admin"
      title="Villalar"
      newHref="/admin/villalar/yeni"
      editHref={(id) => `/admin/villalar/${id}`}
      initialStatus={params.get('status') ?? ''}
    />
  );
}

export default function AdminVillasPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
