'use server';

import { createClient } from '@/lib/supabase/server';
import { isPredictionsLocked } from '@/lib/predictions-lock';

interface ActionResult {
  error?: string;
}

const VALID_REACTIONS = new Set(['like', 'laugh', 'fire', 'shock']);

/**
 * Alterna la reacción del usuario sobre el pronóstico (marcador) de otro
 * usuario en un partido. Una reacción por persona por pronóstico:
 *   - sin reacción previa → inserta
 *   - misma reacción → la quita (toggle off)
 *   - reacción distinta → la cambia
 *
 * Solo disponible post-lock (cuando los pronósticos ya son públicos) y
 * nunca sobre el pronóstico propio. RLS en BD refuerza ambas reglas.
 */
export async function toggleReaction(input: {
  targetUserId: string;
  matchId: string;
  reaction: string;
}): Promise<ActionResult> {
  const { targetUserId, matchId, reaction } = input;

  if (!VALID_REACTIONS.has(reaction)) {
    return { error: 'Reacción inválida' };
  }
  if (!(await isPredictionsLocked())) {
    return { error: 'Las reacciones se habilitan cuando arranca el Mundial' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }
  if (user.id === targetUserId) {
    return { error: 'No puedes reaccionar a tu propio pronóstico' };
  }

  const { data: existing } = await supabase
    .from('prediction_reactions')
    .select('reaction')
    .eq('reactor_id', user.id)
    .eq('target_user_id', targetUserId)
    .eq('match_id', matchId)
    .maybeSingle();

  let error;
  if (!existing) {
    ({ error } = await supabase.from('prediction_reactions').insert({
      reactor_id: user.id,
      target_user_id: targetUserId,
      match_id: matchId,
      reaction,
    }));
  } else if (existing.reaction === reaction) {
    ({ error } = await supabase
      .from('prediction_reactions')
      .delete()
      .eq('reactor_id', user.id)
      .eq('target_user_id', targetUserId)
      .eq('match_id', matchId));
  } else {
    ({ error } = await supabase
      .from('prediction_reactions')
      .update({ reaction })
      .eq('reactor_id', user.id)
      .eq('target_user_id', targetUserId)
      .eq('match_id', matchId));
  }

  if (error) {
    console.error('[toggleReaction]', error.message);
    return { error: 'No pudimos guardar tu reacción. Intenta de nuevo.' };
  }
  return {};
}
