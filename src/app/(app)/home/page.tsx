import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, Trophy } from 'lucide-react';

export const metadata = { title: 'Inicio' };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cargar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, nickname')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
          <Trophy className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            ¡Bienvenido{profile?.nickname ? `, ${profile.nickname}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Has accedido a Polla Mundialista correctamente.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>Sesión iniciada como {profile?.email ?? user?.email}</span>
        </div>

        <div className="pt-8 border-t border-border max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-2">Próximamente</h2>
          <p className="text-sm text-muted-foreground">
            Pronto podrás completar tu perfil, ver el calendario del Mundial, hacer tus pronósticos
            y competir con tus amigos en la tabla de posiciones.
          </p>
        </div>
      </div>
    </div>
  );
}
