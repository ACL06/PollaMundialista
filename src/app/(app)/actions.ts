'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fieldErrorsFrom, profileUpdateSchema } from '@/lib/validators/profile';

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

/**
 * Actualiza los datos del perfil (nombre, apellidos, nickname, celular,
 * avatar y equipo favorito) desde el modal del header. El email NO se
 * modifica. Validación Zod + manejo de nickname duplicado (23505).
 */
export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  favorite_team?: string | null;
  avatar_url?: string;
}): Promise<{ error?: string; fieldErrors?: Record<string, string> }> {
  const parsed = profileUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada. Vuelve a iniciar sesión.' };
  }

  // favorite_team puede limpiarse (null). avatar_url solo se toca si vino
  // (el modal siempre envía uno, pero lo dejamos opcional por robustez).
  const patch: {
    first_name: string;
    last_name: string;
    nickname: string;
    phone: string;
    favorite_team: string | null;
    avatar_url?: string;
  } = {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    nickname: parsed.data.nickname,
    phone: parsed.data.phone,
    favorite_team: parsed.data.favorite_team ?? null,
  };
  if (parsed.data.avatar_url) patch.avatar_url = parsed.data.avatar_url;

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { fieldErrors: { nickname: 'Ese nickname ya está en uso. Elige otro.' } };
    }
    console.error('[updateProfile]', error.message);
    return { error: 'No pudimos guardar los cambios. Intenta de nuevo.' };
  }

  return {};
}
