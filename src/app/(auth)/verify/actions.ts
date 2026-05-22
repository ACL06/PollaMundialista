'use server';

import { createClient } from '@/lib/supabase/server';
import { otpSchema } from '@/lib/validators/auth';

interface ActionResult {
  ok?: boolean;
  error?: string;
}

/**
 * Verifica el código OTP de 6 dígitos.
 * Mensajes de error genéricos para no distinguir entre código incorrecto y expirado.
 */
export async function verifyOtp(email: string, token: string): Promise<ActionResult> {
  const parsed = otpSchema.safeParse({ email, token });
  if (!parsed.success) {
    return { error: 'Código inválido' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: 'email',
  });

  if (error) {
    // Mensaje genérico: no distinguir entre código incorrecto y expirado
    console.error('[verifyOtp] error:', error.message);
    return { error: 'Código incorrecto o expirado' };
  }

  return { ok: true };
}
