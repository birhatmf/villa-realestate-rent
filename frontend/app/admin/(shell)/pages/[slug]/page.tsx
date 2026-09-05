'use client';

import { use } from 'react';
import PageEditor from '@/components/admin/PageEditor';

export default function AdminPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <PageEditor slug={slug} />;
}
