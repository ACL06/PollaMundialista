import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';

export interface ViewerAccess {
  /** El plazo global cerró (el Mundial arrancó). */
  isLocked: boolean;
  isEnrolled: boolean;
  isAdmin: boolean;
  /**
   * "Modo espectador": post-lock + no inscrito + no admin. Puede ver el
   * calendario y la fase de grupos (info pública del Mundial), pero NO las
   * secciones de la polla (pronósticos, comunidad, ranking, montos).
   */
  isSpectator: boolean;
}

/**
 * Resuelve el nivel de acceso del usuario actual. Centraliza la regla del
 * modo espectador para que el AppLayout y cada ruta de la polla la apliquen
 * de forma consistente. Pensado para Server Components.
 */
export async function getViewerAccess(): Promise<ViewerAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lockAt = await getPredictionsLockAt();
  const isLocked = isLockedAt(lockAt);

  if (!user) {
    // Sin sesión el middleware ya redirige; devolvemos un acceso "vacío".
    return { isLocked, isEnrolled: false, isAdmin: false, isSpectator: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_enrolled, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  const isEnrolled = !!profile?.is_enrolled;
  const isAdmin = !!profile?.is_admin;

  return {
    isLocked,
    isEnrolled,
    isAdmin,
    isSpectator: isLocked && !isEnrolled && !isAdmin,
  };
}
