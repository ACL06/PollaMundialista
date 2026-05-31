import type { Match, MatchStage } from '@/lib/types/match';

/**
 * Rondas eliminatorias con captura de marcador en vivo: R32, Octavos,
 * Cuartos, Semifinal y Tercer lugar. La FINAL queda fuera a propósito:
 * tiene su propio bonus de marcador exacto (estricto, por equipo) en el
 * step Cierre, así que no se duplica acá.
 */
export const KNOCKOUT_SCORE_STAGES = ['r32', 'r16', 'qf', 'sf', '3rd'] as const;
export type KnockoutScoreStage = (typeof KNOCKOUT_SCORE_STAGES)[number];

/** ¿El partido pertenece a una ronda con captura de marcador de eliminatoria? */
export function isKnockoutScoreStage(stage: MatchStage): stage is KnockoutScoreStage {
  return (KNOCKOUT_SCORE_STAGES as readonly string[]).includes(stage);
}

/**
 * Estado de la ventana de captura del marcador de UN partido eliminatorio.
 * La ventana es por partido (no por ronda): abre cuando se conocen los dos
 * equipos y cierra en el kickoff de ese partido.
 *
 *   - 'pending': aún no se conocen ambos equipos → no se puede pronosticar
 *                (se muestra el cruce tipo calendario, p.ej. "2A vs 2B").
 *   - 'open':    equipos definidos y el partido no ha arrancado → editable.
 *   - 'closed':  el partido ya arrancó → read-only.
 */
export type KnockoutMatchState = 'pending' | 'open' | 'closed';

export function knockoutMatchState(match: Match, now: Date): KnockoutMatchState {
  const teamsKnown = match.home_team != null && match.away_team != null;
  if (!teamsKnown) return 'pending';
  return now.getTime() < new Date(match.kicks_off_at).getTime() ? 'open' : 'closed';
}
