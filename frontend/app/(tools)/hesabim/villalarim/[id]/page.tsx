'use client';

import { use } from 'react';
import VillaForm from '@/components/villas/VillaForm';

export default function EditHostVillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <VillaForm scope="host" villaId={id} backHref="/hesabim/villalarim" />;
}
