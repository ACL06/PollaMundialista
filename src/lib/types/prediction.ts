/**
 * Tipos del modelo de pronósticos.
 *
 * Cada usuario tiene exactamente una fila en `predictions` (campos
 * generales: campeón, finalista, 3er puesto, marcador final, goleador),
 * más hasta 72 filas en `prediction_group_scores` (un marcador por
 * partido de fase de grupos), más hasta 60 filas en `prediction_bracket`
 * (los equipos predichos como clasificados a cada ronda eliminatoria:
 * 32 + 16 + 8 + 4 = 60).
 *
 * El lock global se enforza en BD vía RLS contra `predictions_lock_at()`,
 * que devuelve `matches.kicks_off_at` del match #1.
 */

export type PredictionBracketRound = 'r32' | 'r16' | 'qf' | 'sf';

/**
 * Pronóstico principal del usuario.
 * Una sola fila por usuario; `locked_at` se setea cuando envía el
 * pronóstico definitivo y es inmutable a partir de ahí (trigger en BD).
 */
export interface Prediction {
  user_id: string;
  /** Null mientras el usuario edita libremente; timestamp ISO cuando envía. */
  locked_at: string | null;
  /** Código del equipo predicho como campeón. */
  champion_code: string | null;
  /** Código del equipo predicho como subcampeón (finalista). */
  runner_up_code: string | null;
  /** Código del equipo predicho como tercer puesto. */
  third_place_code: string | null;
  /** Bonus: marcador exacto de la final (goles del local). */
  final_home_score: number | null;
  /** Bonus: marcador exacto de la final (goles del visitante). */
  final_away_score: number | null;
  /** Nombre del goleador del torneo predicho (texto libre). */
  top_scorer: string | null;
  created_at: string;
  updated_at: string;
}

/** Marcador exacto predicho para un partido de fase de grupos. */
export interface PredictionGroupScore {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
}

/**
 * Un equipo que el usuario predijo que clasifica a una ronda dada.
 * Las reglas de subset (R16 ⊆ R32, QF ⊆ R16, etc.) se validan en
 * server action y UI — la BD solo enforza que `round` sea uno de los
 * valores permitidos y que `team_code` exista en `teams`.
 */
export interface PredictionBracketEntry {
  user_id: string;
  round: PredictionBracketRound;
  team_code: string;
}
