import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { CalendarDays, CheckCircle2, Target, Trophy } from 'lucide-react';
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
          <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted relative">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={`Avatar de ${profile.nickname}`}
                width={96}
                height={96}
                className="h-full w-full"
                unoptimized
                priority
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
            <p className="text-muted-foreground text-lg flex items-center justify-center gap-2">
              <span className={`fi fi-${team.flag} rounded-sm`} aria-hidden="true" />
              <span>Hincha de {team.name}</span>
            </p>
          )}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>Sesión iniciada como {profile?.email ?? user?.email}</span>
        </div>

        <div className="pt-7 mt-6 border-t border-border max-w-md mx-auto flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Explora</h2>
          <p className="text-sm text-muted-foreground">
            El calendario ya está disponible. Pronto podrás hacer pronósticos y competir
            con tus amigos en la tabla de posiciones.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Link
              href="/calendar"
              className="flex flex-col items-center gap-2.5 px-3 py-[18px] rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CalendarDays className="h-[18px] w-[18px] text-tertiary" />
              <span className="text-[13px] font-medium">Calendario</span>
            </Link>
            <Link
              href="/pronosticos"
              className="flex flex-col items-center gap-2.5 px-3 py-[18px] rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Target className="h-[18px] w-[18px] text-tertiary" />
              <span className="text-[13px] font-medium">Pronósticos</span>
            </Link>
            <div
              className="flex flex-col items-center gap-2.5 px-3 py-[18px] rounded-lg border border-border bg-surface text-muted-foreground opacity-60"
              aria-label="Ranking (próximamente)"
            >
              <Trophy className="h-[18px] w-[18px] text-tertiary" />
              <span className="text-[13px] font-medium">Ranking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
