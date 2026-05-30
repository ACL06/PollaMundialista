import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Logo } from '@/components/shared/Logo';
import { TabNav } from '@/components/app/TabNav';
import { LogoutButton } from './LogoutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, first_name, last_name, phone')
    .eq('id', user.id)
    .single();

  // Si falta cualquiera de los datos obligatorios del onboarding, lo
  // redirigimos a completar el perfil. Defensa en profundidad: la UI
  // y el server action ya los exigen, pero un perfil parcial nunca
  // debería poder llegar a /home.
  if (
    !profile?.nickname ||
    !profile?.first_name ||
    !profile?.last_name ||
    !profile?.phone
  ) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo variant="full" width={180} height={45} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <TabNav />

      <main className="flex-1">{children}</main>
    </div>
  );
}
