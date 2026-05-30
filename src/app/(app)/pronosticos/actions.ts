'use server';

import { createClient } from '@/lib/supabase/server';
import { isPredictionsLocked } from '@/lib/predictions-lock';
import { groupScoreSchema, bracketToggleSchema } from '@/lib/validators/prediction';
import {
  BRACKET_ROUND_SIZE,
  BRACKET_R32_GROUP_MAX,
  previousRound,
  roundsFrom,
} from '@/lib/types/prediction';

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

/**
 * Agrega o quita un equipo de una ronda del bracket eliminatorio.
 *
 * Al AGREGAR (`selected: true`):
 *   - Rechaza si la ronda ya alcanzó su cupo (32/16/8/4).
 *   - Rechaza si el equipo no está en la ronda anterior (subset).
 *   - Idempotente: si ya estaba, no hace nada.
 *
 * Al QUITAR (`selected: false`):
 *   - Elimina el equipo de esta ronda y de TODAS las posteriores
 *     (cascada): no puede estar en cuartos quien dejó de estar en
 *     octavos.
 *
 * Triple barrera de validación: Zod, lock global, y RLS en BD.
 */
export async function toggleBracketTeam(input: {
  round: 'r32' | 'r16' | 'qf' | 'sf';
  team_code: string;
  selected: boolean;
}): Promise<ActionResult> {
  const parsed = bracketToggleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const { round, team_code, selected } = parsed.data;

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

  if (selected) {
    // ¿Ya estaba? → no-op idempotente
    const { data: existing } = await supabase
      .from('prediction_bracket')
      .select('team_code')
      .eq('user_id', user.id)
      .eq('round', round)
      .eq('team_code', team_code)
      .maybeSingle();
    if (existing) return {};

    // Cupo de la ronda
    const { count, error: countError } = await supabase
      .from('prediction_bracket')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('round', round);
    if (countError) {
      console.error('[toggleBracketTeam] count', countError.message);
      return { error: 'No pudimos guardar. Intenta de nuevo.' };
    }
    if ((count ?? 0) >= BRACKET_ROUND_SIZE[round]) {
      return { error: `Ya seleccionaste los ${BRACKET_ROUND_SIZE[round]} de esta ronda` };
    }

    // Regla 2-3 por grupo en Dieciseisavos: máximo 3 equipos del mismo grupo.
    if (round === 'r32') {
      const { data: teamRow } = await supabase
        .from('teams')
        .select('group_code')
        .eq('code', team_code)
        .maybeSingle();
      const group = teamRow?.group_code;
      if (group) {
        const { data: r32Rows } = await supabase
          .from('prediction_bracket')
          .select('team_code')
          .eq('user_id', user.id)
          .eq('round', 'r32');
        const codes = (r32Rows ?? []).map((r) => r.team_code);
        if (codes.length > 0) {
          const { data: sameGroup } = await supabase
            .from('teams')
            .select('code')
            .eq('group_code', group)
            .in('code', codes);
          if ((sameGroup?.length ?? 0) >= BRACKET_R32_GROUP_MAX) {
            return { error: `Máximo ${BRACKET_R32_GROUP_MAX} equipos por grupo en Dieciseisavos` };
          }
        }
      }
    }

    // Subset: debe estar en la ronda anterior (salvo r32 que no tiene)
    const prev = previousRound(round);
    if (prev) {
      const { data: inPrev } = await supabase
        .from('prediction_bracket')
        .select('team_code')
        .eq('user_id', user.id)
        .eq('round', prev)
        .eq('team_code', team_code)
        .maybeSingle();
      if (!inPrev) {
        return { error: 'El equipo debe clasificar primero en la ronda anterior' };
      }
    }

    const { error } = await supabase
      .from('prediction_bracket')
      .insert({ user_id: user.id, round, team_code });
    if (error) {
      console.error('[toggleBracketTeam] insert', error.message);
      return { error: 'No pudimos guardar. Intenta de nuevo.' };
    }
    return {};
  }

  // Quitar: cascada a esta ronda + todas las posteriores
  const { error } = await supabase
    .from('prediction_bracket')
    .delete()
    .eq('user_id', user.id)
    .eq('team_code', team_code)
    .in('round', roundsFrom(round));
  if (error) {
    console.error('[toggleBracketTeam] delete', error.message);
    return { error: 'No pudimos guardar. Intenta de nuevo.' };
  }
  return {};
}
