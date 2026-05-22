import { createClient } from '@/lib/supabase/server';
import { CheckCircle2 } from 'lucide-react';
import { WORLD_CUP_TEAMS } from '@/lib/validators/profile';

export const metadata = { title: 'Inicio' };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, nickname, avatar_url, favorite_team')
    .eq('id', user!.id)
    .single();

  const team = WORLD_CUP_TEAMS.find((t) => t.code === profile?.favorite_team);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="text-center space-y-6">

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`Avatar de ${profile.nickname}`}
                className="h-full w-full"
              />
            ) : (
              <div className="h-full w-full bg-primary/10" />
            )}
          </div>
        </div>

        {/* Saludo */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nickname}!
          </h1>
          {team && (
            <p className="text-muted-foreground text-lg">
              {team.flag} Hincha de {team.name}
            </p>
          )}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>Sesión iniciada como {profile?.email ?? user?.email}</span>
        </div>

        <div className="pt-8 border-t border-border max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-2">Próximamente</h2>
          <p className="text-sm text-muted-foreground">
            Pronto podrás ver el calendario del Mundial, hacer tus pronósticos y competir
            con tus amigos en la tabla de posiciones.
          </p>
        </div>
      </div>
    </div>
  );
}
