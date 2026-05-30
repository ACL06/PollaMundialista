'use server';

import { createClient } from '@/lib/supabase/server';
import { isPredictionsLocked } from '@/lib/predictions-lock';
import { groupScoreSchema } from '@/lib/validators/prediction';

interface ActionResult {
  error?: string;
}

/**
 * Guarda un marcador predicho para un partido específico de fase de
 * grupos. Usa `upsert` sobre la PK compuesta (user_id, match_id), así
 * que llamar varias veces con el mismo match_id sobreescribe.
 *
 * Validación en triple barrera:
 *   1. Zod aquí abajo (forma y rango)
 *   2. Lock global vía `isPredictionsLocked()` (defensa explícita)
 *   3. RLS en BD (último filtro: las policies de insert/update chequean
 *      `now() < predictions_lock_at()`)
 */
export async function saveGroupScore(input: {
  match_id: string;
  home_score: number;
  away_score: number;
}): Promise<ActionResult> {
  const parsed = groupScoreSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  if (await isPredictionsLocked()) {
    return { error: 'El plazo de pronósticos ya cerró' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }

  const { error } = await supabase.from('prediction_group_scores').upsert({
    user_id: user.id,
    match_id: parsed.data.match_id,
    home_score: parsed.data.home_score,
    away_score: parsed.data.away_score,
  });

  if (error) {
    console.error('[saveGroupScore]', error.message);
    return { error: 'No pudimos guardar el marcador. Intenta de nuevo.' };
  }

  return {};
}
