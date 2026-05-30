'use server';

import { createClient } from '@/lib/supabase/server';
import {
  groupScoreSchema,
  bracketToggleSchema,
  predictionMetaSchema,
} from '@/lib/validators/prediction';
import {
  BRACKET_ROUND_SIZE,
  BRACKET_R32_GROUP_MAX,
  previousRound,
  roundsFrom,
} from '@/lib/types/prediction';

interface ActionResult {
  error?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Devuelve un mensaje si el usuario NO puede editar su pronóstico:
 *   - El plazo global ya cerró (kickoff del match #1), o
 *   - El usuario ya envió su pronóstico (locked_at seteado → one-shot).
 * Devuelve null si puede editar. Usa el mismo cliente de la action para
 * no abrir conexiones extra.
 */
async function editBlockReason(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string | null> {
  const { data: m1 } = await supabase
    .from('matches')
    .select('kicks_off_at')
    .eq('match_number', 1)
    .maybeSingle();
  if (m1 && new Date() >= new Date(m1.kicks_off_at)) {
    return 'El plazo de pronósticos ya cerró';
  }
  const { data: pred } = await supabase
    .from('predictions')
    .select('locked_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (pred?.locked_at) {
    return 'Ya enviaste tu pronóstico; no se puede modificar';
  }
  return null;
}

/**
 * Guarda un marcador predicho para un partido de fase de grupos.
 * `upsert` sobre la PK compuesta (user_id, match_id) → idempotente.
 *
 * Validación en capas: Zod (forma/rango) → editBlockReason (lock global
 * + submit propio) → RLS en BD.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }

  const blocked = await editBlockReason(supabase, user.id);
  if (blocked) return { error: blocked };

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
 *   - En r32, rechaza si el grupo del equipo ya tiene 3 (regla 2-3).
 *   - Rechaza si el equipo no está en la ronda anterior (subset).
 *   - Idempotente: si ya estaba, no hace nada.
 *
 * Al QUITAR (`selected: false`):
 *   - Elimina el equipo de esta ronda y de TODAS las posteriores (cascada).
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }

  const blocked = await editBlockReason(supabase, user.id);
  if (blocked) return { error: blocked };

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

/**
 * Guarda los campos "meta" del pronóstico (campeón, subcampeón, tercer
 * puesto, marcador exacto de la final, goleador). Solo persiste los
 * campos que llegan definidos — `null` limpia, `undefined` no toca.
 * `upsert` sobre la PK user_id.
 */
export async function savePredictionMeta(input: {
  champion_code?: string | null;
  runner_up_code?: string | null;
  third_place_code?: string | null;
  final_home_score?: number | null;
  final_away_score?: number | null;
  top_scorer?: string | null;
}): Promise<ActionResult> {
  const parsed = predictionMetaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }

  const blocked = await editBlockReason(supabase, user.id);
  if (blocked) return { error: blocked };

  // Solo incluir las claves definidas (las que el cliente quiso tocar).
  const row: Record<string, unknown> = { user_id: user.id };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) row[key] = value;
  }

  const { error } = await supabase.from('predictions').upsert(row);
  if (error) {
    console.error('[savePredictionMeta]', error.message);
    return { error: 'No pudimos guardar. Intenta de nuevo.' };
  }

  return {};
}

/**
 * Envío definitivo del pronóstico: setea `locked_at = now()`. A partir
 * de ahí el pronóstico es inmutable (one-shot), enforzado por:
 *   - editBlockReason en las demás actions (no más edición)
 *   - trigger `predictions_locked_at_immutable` en BD
 * Rechaza si ya está enviado o si el plazo global ya cerró.
 */
export async function submitPrediction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }

  const blocked = await editBlockReason(supabase, user.id);
  if (blocked) return { error: blocked };

  const { error } = await supabase
    .from('predictions')
    .upsert({ user_id: user.id, locked_at: new Date().toISOString() });
  if (error) {
    console.error('[submitPrediction]', error.message);
    return { error: 'No pudimos enviar tu pronóstico. Intenta de nuevo.' };
  }

  return {};
}
