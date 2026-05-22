'use server';

import { createClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/validators/auth';

interface ActionResult {
  ok?: boolean;
  error?: string;
}

/**
 * Envía un OTP de 6 dígitos al correo del usuario.
 * Mensajes de error genéricos para no revelar si el email existe.
 */
export async function sendOtp(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: 'Correo electrónico inválido' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Crea el usuario si no existe (necesario para signup automático)
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Mensajes genéricos para no leakear información
    if (error.message.toLowerCase().includes('rate limit')) {
      return { error: 'Demasiados intentos. Espera un momento e intenta de nuevo.' };
    }
    if (error.message.toLowerCase().includes('email')) {
      return { error: 'No pudimos enviar el código. Verifica tu correo e intenta de nuevo.' };
    }
    // Log para debugging server-side, sin exponer al cliente
    console.error('[sendOtp] error:', error.message);
    return { error: 'No pudimos enviar el código. Intenta de nuevo en unos segundos.' };
  }

  return { ok: true };
}
