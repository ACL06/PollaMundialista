import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Logo } from '@/components/shared/Logo';
import { TabNav } from '@/components/app/TabNav';
import { UserBadge } from '@/components/app/UserBadge';
import { ProfileMenu } from '@/components/app/ProfileMenu';
import { NotEnrolledScreen } from '@/components/app/NotEnrolledScreen';
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

  // Acceso de pre-inscritos (#2): cuando arranca el Mundial (lock global), un
  // usuario que no completó su inscripción —y no es admin— pierde el acceso.
  const lockAt = await getPredictionsLockAt();
  const isLocked = isLockedAt(lockAt);
  const isPreEnrolled = !profile.is_enrolled && !profile.is_admin;

  if (isLocked && isPreEnrolled) {
    return <NotEnrolledScreen />;
  }

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
            <UserBadge
              firstName={profile.first_name}
              lastName={profile.last_name}
              favoriteTeam={favoriteTeam}
            />
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <ProfileMenu
              email={profile.email ?? user.email ?? ''}
              avatarUrl={profile.avatar_url}
              firstName={profile.first_name}
              lastName={profile.last_name}
              nickname={profile.nickname}
              phone={profile.phone}
              favoriteTeam={profile.favorite_team ?? null}
            />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <TabNav />

      <main className="flex-1">{children}</main>

      {/* #16: recordatorio de inscripción (pre-inscritos, últimos 5 días). */}
      {isPreEnrolled && <EnrollmentReminderModal lockAtIso={lockAt?.toISOString() ?? null} />}
    </div>
  );
}
