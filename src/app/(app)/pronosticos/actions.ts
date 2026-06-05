'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  groupScoreSchema,
  bracketToggleSchema,
  predictionMetaSchema,
} from '@/lib/validators/prediction';
import {
  BRACKET_ROUND_SIZE,
  BRACKET_R32_GROUP_MAX,
  BRACKET_R32_MAX_THIRDS,
  previousRound,
  roundsFrom,
} from '@/lib/types/prediction';

interface ActionResult {
  error?: string;
  /** true si el rechazo fue por el lock global (plazo cerrado) → la UI pasa a read-only. */
  locked?: boolean;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Invalida el caché de las vistas que dependen del pronóstico del usuario,
 * para que tras un autosave los cambios se reflejen al NAVEGAR (sin recarga
 * dura). Sin esto, el Router Cache de Next reusa el render viejo de
 * /pronosticos y los marcadores recién guardados se ven vacíos hasta que el
 * usuario recarga la página. /home tiene la tarjeta de progreso/estado.
 */
function revalidatePredictionViews() {
  revalidatePath('/pronosticos');
  revalidatePath('/home');
}

/**
 * Devuelve un mensaje si el usuario NO puede editar su pronóstico.
 * El único bloqueo es el **lock global** (kickoff del match #1): mientras el
 * Mundial no arranca, el usuario puede seguir editando aunque ya haya
 * enviado (el envío deja de ser inmutable; queda como "enviado" pero
 * editable). Devuelve null si puede editar.
 */
async function editBlockReason(supabase: SupabaseServerClient): Promise<string | null> {
  const { data: m1 } = await supabase
    .from('matches')
    .select('kicks_off_at')
    .eq('match_number', 1)
    .maybeSingle();
  if (m1 && new Date() >= new Date(m1.kicks_off_at)) {
    return 'El plazo de pronósticos ya cerró';
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

  const blocked = await editBlockReason(supabase);
  if (blocked) return { error: blocked, locked: true };

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

  revalidatePredictionViews();
  return {};
}

const KNOCKOUT_SCORE_STAGES = ['r32', 'r16', 'qf', 'sf', '3rd'];

/**
 * Guarda el marcador predicho de un partido de ELIMINATORIA (R32, Octavos,
 * Cuartos, Semifinal o Tercer lugar — la final tiene su bonus aparte).
 *
 * A diferencia de los de grupos, su ventana es POR PARTIDO: solo se puede
 * editar mientras el partido tiene ambos equipos definidos y aún no arranca.
 * La RLS es el guard real (funciones `knockout_match_editable`); acá hacemos
 * el mismo chequeo para devolver un mensaje claro.
 */
export async function saveKnockoutScore(input: {
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

  const { data: match } = await supabase
    .from('matches')
    .select('stage, home_team_code, away_team_code, kicks_off_at')
    .eq('id', parsed.data.match_id)
    .maybeSingle();

  if (!match || !KNOCKOUT_SCORE_STAGES.includes(match.stage)) {
    return { error: 'Este partido no admite marcador de eliminatoria' };
  }
  if (match.home_team_code == null || match.away_team_code == null) {
    return { error: 'Este cruce todavía no tiene equipos definidos' };
  }
  if (new Date() >= new Date(match.kicks_off_at)) {
    return { error: 'Este partido ya comenzó; no se puede modificar' };
  }

  const { error } = await supabase.from('prediction_knockout_scores').upsert({
    user_id: user.id,
    match_id: parsed.data.match_id,
    home_score: parsed.data.home_score,
    away_score: parsed.data.away_score,
  });

  if (error) {
    console.error('[saveKnockoutScore]', error.message);
    return { error: 'No pudimos guardar el marcador. Intenta de nuevo.' };
  }

  // Refresca /pronosticos (pestaña Eliminatorias) y el contador de "cruces
  // abiertos" del aviso en /home, para que se reflejen al navegar sin reload.
  revalidatePredictionViews();
  return {};
}

/**
 * Agrega o quita un equipo de una ronda del bracket eliminatorio.
 *
 * Al AGREGAR (`selected: true`):
 *   - Rechaza si la ronda ya alcanzó su cupo (32/16/8/4).
 *   - En r32, rechaza si el grupo del equipo ya tiene 3 (máx por grupo) o
 *     si llevaría su grupo a 3 cuando ya hay 8 grupos con 3 (tope de
 *     terceros: solo 8 de los 12 grupos aportan un tercer equipo).
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

  const blocked = await editBlockReason(supabase);
  if (blocked) return { error: blocked, locked: true };

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

    // Reglas de Eliminatorias de 32: máximo 3 por grupo y máximo 8 grupos con 3
    // (los 8 mejores terceros). Calculamos los conteos por grupo con los
    // equipos ya elegidos en r32 en una sola consulta.
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
          const { data: chosen } = await supabase
            .from('teams')
            .select('code, group_code')
            .in('code', codes);
          const countByGroup = new Map<string, number>();
          for (const t of chosen ?? []) {
            if (!t.group_code) continue;
            countByGroup.set(t.group_code, (countByGroup.get(t.group_code) ?? 0) + 1);
          }
          const sameGroupCount = countByGroup.get(group) ?? 0;
          // Máximo 3 equipos del mismo grupo.
          if (sameGroupCount >= BRACKET_R32_GROUP_MAX) {
            return { error: `Máximo ${BRACKET_R32_GROUP_MAX} equipos por grupo en Eliminatorias de 32` };
          }
          // Tope de terceros: si este equipo llevaría su grupo a 3, no puede
          // haber ya 8 grupos con 3.
          if (sameGroupCount === BRACKET_R32_GROUP_MAX - 1) {
            let groupsWithMax = 0;
            for (const c of countByGroup.values()) {
              if (c >= BRACKET_R32_GROUP_MAX) groupsWithMax += 1;
            }
            if (groupsWithMax >= BRACKET_R32_MAX_THIRDS) {
              return {
                error: `Solo ${BRACKET_R32_MAX_THIRDS} grupos pueden aportar un tercer equipo`,
              };
            }
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
    revalidatePredictionViews();
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
  revalidatePredictionViews();
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

  const blocked = await editBlockReason(supabase);
  if (blocked) return { error: blocked, locked: true };

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

  revalidatePredictionViews();
  return {};
}

/**
 * Marca el pronóstico como "enviado": setea `locked_at = now()`. Ya NO es
 * inmutable — el usuario puede seguir editando (vía autosave) hasta el lock
 * global; el envío solo registra que lo dio por listo una vez.
 * Idempotente: si ya tiene `locked_at`, no lo reescribe (el trigger
 * `predictions_locked_at_immutable` bloquea cambiarlo). Rechaza si el plazo
 * global ya cerró.
 */
export async function submitPrediction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión expirada' };
  }

  const blocked = await editBlockReason(supabase);
  if (blocked) return { error: blocked, locked: true };

  // Si ya está enviado, no reescribir locked_at (idempotente).
  const { data: existing } = await supabase
    .from('predictions')
    .select('locked_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing?.locked_at) return {};

  const { error } = await supabase
    .from('predictions')
    .upsert({ user_id: user.id, locked_at: new Date().toISOString() });
  if (error) {
    console.error('[submitPrediction]', error.message);
    return { error: 'No pudimos enviar tu pronóstico. Intenta de nuevo.' };
  }

  revalidatePredictionViews();
  return {};
}
