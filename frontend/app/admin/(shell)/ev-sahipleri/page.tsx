'use client';

import { Suspense } from 'react';
import HostApplicationsTable from '@/components/admin/HostApplicationsTable';

export default function AdminHostApplicationsPage() {
  return (
    <Suspense>
      <HostApplicationsTable />
    </Suspense>
  );
}
