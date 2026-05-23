'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Cierra la sesión en el servidor y redirige a /login.
 * Limpia las cookies en el mismo response del redirect — evita el race
 * condition de hacerlo client-side donde push/refresh pueden navegar
 * antes de que se propaguen las cookies vacías y el middleware piense
 * que el usuario sigue autenticado.
 */
export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
