import { redirect } from 'next/navigation';
import { Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Logo } from '@/components/shared/Logo';
import { TabNav } from '@/components/app/TabNav';
import { ProfileMenu } from '@/components/app/ProfileMenu';
import { EnrollmentReminderModal } from '@/components/app/EnrollmentReminderModal';
import { WORLD_CUP_TEAMS } from '@/lib/validators/profile';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
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
    .select('email, nickname, first_name, last_name, phone, favorite_team, avatar_url, is_admin, is_enrolled')
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

  // Modo espectador: cuando arranca el Mundial (lock global), un usuario que no
  // completó su inscripción —y no es admin— pasa a acceso limitado: ve el
  // calendario y la fase de grupos, pero NO las secciones de la polla. Cada
  // ruta de la polla lo refuerza con <SpectatorBlocked /> (defensa en
  // profundidad por si entran por URL); acá ocultamos sus pestañas y avisamos.
  const lockAt = await getPredictionsLockAt();
  const isLocked = isLockedAt(lockAt);
  const isPreEnrolled = !profile.is_enrolled && !profile.is_admin;
  const isSpectator = isLocked && isPreEnrolled;

  // Mapear el código del equipo favorito al objeto Team (con bandera).
  // Como WORLD_CUP_TEAMS es readonly, casteamos al tipo mutable que
  // UserBadge espera. group_code = null porque el catálogo TS no lo trae.
  const favoriteTeamRaw = profile.favorite_team
    ? WORLD_CUP_TEAMS.find((t) => t.code === profile.favorite_team)
    : null;
  const favoriteTeam = favoriteTeamRaw
    ? { ...favoriteTeamRaw, group_code: null }
    : null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Logo variant="full" width={180} height={45} />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <ProfileMenu
              email={profile.email ?? user.email ?? ''}
              avatarUrl={profile.avatar_url}
              firstName={profile.first_name}
              lastName={profile.last_name}
              nickname={profile.nickname}
              phone={profile.phone}
              favoriteTeam={favoriteTeam}
            />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <TabNav isSpectator={isSpectator} />

      {isSpectator && (
        <div className="border-b border-tertiary/30 bg-tertiary/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-start gap-2 text-sm text-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-tertiary" />
            <span>
              Las inscripciones están cerradas. Estás en{' '}
              <span className="font-semibold">modo espectador</span>: puedes ver el calendario y la
              fase de grupos.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* #16: recordatorio de inscripción (pre-inscritos, últimos 5 días ANTES
        * del lock). Post-lock no se monta: el pre-inscrito pasa a modo
        * espectador y ve el banner de "inscripciones cerradas". */}
      {isPreEnrolled && !isLocked && (
        <EnrollmentReminderModal lockAtIso={lockAt?.toISOString() ?? null} />
      )}
    </div>
  );
}
