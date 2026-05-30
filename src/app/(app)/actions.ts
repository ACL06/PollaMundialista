'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { profileUpdateSchema } from '@/lib/validators/profile';

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
 * Actualiza los datos base del perfil (nombre, apellidos, nickname,
 * celular) desde el modal del header. El email NO se modifica.
 * Validación Zod + manejo de nickname duplicado (23505).
 */
export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
}): Promise<{ error?: string }> {
  const parsed = profileUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada. Vuelve a iniciar sesión.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      nickname: parsed.data.nickname,
      phone: parsed.data.phone,
    })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ese nickname ya está en uso. Elige otro.' };
    }
    console.error('[updateProfile]', error.message);
    return { error: 'No pudimos guardar los cambios. Intenta de nuevo.' };
  }

  return {};
}
