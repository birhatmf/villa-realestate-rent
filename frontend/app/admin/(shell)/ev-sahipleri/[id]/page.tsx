'use client';

import { use } from 'react';
import HostApplicationDetail from '@/components/admin/HostApplicationDetail';

export default function AdminHostApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <HostApplicationDetail id={id} />;
}
