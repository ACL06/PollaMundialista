/**
 * Tipos del modelo de pronósticos.
 *
 * Cada usuario tiene exactamente una fila en `predictions` (campos
 * generales: campeón, finalista, tercer lugar, marcador final, goleador),
 * más hasta 72 filas en `prediction_group_scores` (un marcador por
 * partido de fase de grupos), más hasta 60 filas en `prediction_bracket`
 * (los equipos predichos como clasificados a cada ronda eliminatoria:
 * 32 + 16 + 8 + 4 = 60).
 *
 * El lock global se enforza en BD vía RLS contra `predictions_lock_at()`,
 * que devuelve `matches.kicks_off_at` del match #1.
 */

export type PredictionBracketRound = 'r32' | 'r16' | 'qf' | 'sf';

/** Orden de las rondas del bracket, de más temprana a más tardía. */
export const BRACKET_ROUNDS: readonly PredictionBracketRound[] = ['r32', 'r16', 'qf', 'sf'];

/** Cuántos equipos se seleccionan en cada ronda. */
export const BRACKET_ROUND_SIZE: Record<PredictionBracketRound, number> = {
  r32: 32,
  r16: 16,
  qf: 8,
  sf: 4,
};

/**
 * En Eliminatorias de 32 (r32) cada grupo aporta entre 2 y 3 equipos:
 *   - 2 fijos: el 1° y 2° de cada grupo (24 en total)
 *   - hasta 1 más: si su 3° está entre los 8 mejores terceros
 * Como 12×2 = 24 y faltan 8 para llegar a 32, exactamente 8 grupos
 * aportan un tercero. La regla "2 o 3 por grupo + total 32" captura
 * esto sin necesidad de modelar el ranking de terceros.
 */
export const BRACKET_R32_GROUP_MIN = 2;
export const BRACKET_R32_GROUP_MAX = 3;

/**
 * Cuántos grupos pueden aportar un 3.er equipo a Eliminatorias de 32.
 * 12 grupos × 2 fijos = 24; faltan 8 para llegar a 32, así que solo 8
 * grupos pueden llegar a 3 (los 8 mejores terceros). Cuando ya hay 8
 * grupos con 3, el 9.º grupo que intente un tercero queda bloqueado.
 */
export const BRACKET_R32_MAX_THIRDS = 8;

/** Etiqueta humana de cada ronda. */
export const BRACKET_ROUND_LABEL: Record<PredictionBracketRound, string> = {
  r32: 'Eliminatorias de 32',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
};

/**
 * Devuelve una ronda y todas las posteriores a ella (downstream incluido).
 * Usado para la cascada: si un equipo deja de clasificar a una ronda,
 * tampoco puede estar en las siguientes.
 *   roundsFrom('r16') → ['r16', 'qf', 'sf']
 */
export function roundsFrom(round: PredictionBracketRound): PredictionBracketRound[] {
  const i = BRACKET_ROUNDS.indexOf(round);
  return [...BRACKET_ROUNDS.slice(i)];
}

/** La ronda inmediatamente anterior, o null si es la primera (r32). */
export function previousRound(
  round: PredictionBracketRound,
): PredictionBracketRound | null {
  const i = BRACKET_ROUNDS.indexOf(round);
  return i > 0 ? BRACKET_ROUNDS[i - 1] : null;
}

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
  /** Código del equipo predicho como tercer lugar. */
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
 * Marcador exacto predicho para un partido de eliminatoria
 * (R32, Octavos, Cuartos, Semifinal o Tercer lugar — la final tiene su
 * propio bonus). Misma forma que los de grupos pero vive en una tabla
 * aparte porque su ventana de edición es POR PARTIDO: abre cuando se
 * conocen los dos equipos y cierra en el kickoff de ese partido (no
 * depende del lock global del pronóstico).
 */
export interface PredictionKnockoutScore {
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
