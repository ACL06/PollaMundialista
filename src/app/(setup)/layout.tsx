import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthShell } from '@/components/shared/AuthShell';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AuthShell>{children}</AuthShell>;
}
