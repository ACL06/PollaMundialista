import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/shared/Logo';
import { OnboardingForm } from './OnboardingForm';

export const metadata = { title: 'Completa tu perfil' };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single();

  if (profile?.nickname) redirect('/home');

  return (
    <>
      <div className="flex flex-col items-center text-center space-y-3">
        <Logo variant="full" width={180} height={45} />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            Crea tu perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Un nickname, un avatar y a jugar.
          </p>
        </div>
      </div>

      <OnboardingForm />
    </>
  );
}
