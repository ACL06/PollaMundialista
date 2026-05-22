'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validators/profile';
import { getAvatarUrl } from '@/lib/avatar';

interface ActionResult {
  error?: string;
}

export async function saveProfile(data: {
  nickname: string;
  favorite_team?: string | null;
}): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(data);
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

  // upsert en lugar de update: crea la fila si el trigger no la creó
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      nickname: parsed.data.nickname,
      avatar_url: getAvatarUrl(parsed.data.nickname),
      favorite_team: parsed.data.favorite_team ?? null,
    });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ese nickname ya está en uso. Elige otro.' };
    }
    console.error('[saveProfile]', error.message);
    return { error: 'No pudimos guardar tu perfil. Intenta de nuevo.' };
  }

  redirect('/home');
}
