'use client';

import { createBrowserClient } from '@supabase/ssr';

export default function AgentProfile() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">AgentProfile</h2>
      <p className="text-gray-600">Component placeholder - ready for implementation</p>
    </div>
  );
}
