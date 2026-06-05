'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fieldErrorsFrom, profileSchema } from '@/lib/validators/profile';
import { getAvatarUrl } from '@/lib/avatar';

interface ActionResult {
  error?: string;
  /** Errores por campo, para marcar el input puntual en el form. */
  fieldErrors?: Record<string, string>;
}

export async function saveProfile(data: {
  first_name: string;
  last_name: string;
  phone: string;
  nickname: string;
  favorite_team?: string | null;
  avatar_url?: string;
}): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(data);
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

  // Si el cliente no envió avatar_url, generar uno por defecto del nickname
  const avatarUrl = parsed.data.avatar_url ?? getAvatarUrl(parsed.data.nickname);

  // upsert en lugar de update: crea la fila si el trigger no la creó
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone,
      nickname: parsed.data.nickname,
      avatar_url: avatarUrl,
      favorite_team: parsed.data.favorite_team ?? null,
    });

  if (error) {
    if (error.code === '23505') {
      return { fieldErrors: { nickname: 'Ese nickname ya está en uso. Elige otro.' } };
    }
    console.error('[saveProfile]', error.message);
    return { error: 'No pudimos guardar tu perfil. Intenta de nuevo.' };
  }

  redirect('/home');
}
