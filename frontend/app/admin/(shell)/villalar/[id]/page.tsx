'use client';

import { use } from 'react';
import VillaForm from '@/components/villas/VillaForm';

export default function EditAdminVillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <VillaForm scope="admin" villaId={id} backHref="/admin/villalar" />;
}
