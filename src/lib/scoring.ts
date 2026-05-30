import {
  BRACKET_ROUNDS,
  type Prediction,
  type PredictionBracketEntry,
  type PredictionBracketRound,
  type PredictionGroupScore,
} from '@/lib/types/prediction';
import type { Match } from '@/lib/types/match';

/**
 * Motor de scoring de la polla. Función pura: recibe el pronóstico de un
 * usuario y los resultados oficiales, devuelve el desglose de puntos.
 *
 * Reglas (máximo teórico 643):
 *   - Marcador exacto de grupos: 5 (× 72 = 360)
 *   - Solo resultado (gana/empata) sin marcador exacto: 2
 *   - Clasificado a Dieciseisavos: 2 c/u (× 32 = 64)
 *   - Clasificado a Octavos: 3 c/u (× 16 = 48)
 *   - Clasificado a Cuartos: 5 c/u (× 8 = 40)
 *   - Clasificado a Semifinales: 8 c/u (× 4 = 32)
 *   - Finalista (campeón + subcampeón que llegan a la final): 12 c/u (× 2 = 24)
 *   - Tercer puesto correcto: 15
 *   - Campeón correcto: 30
 *   - Marcador exacto de la final: 15
 *   - Goleador: 15
 */

export const SCORING = {
  groupExact: 5,
  groupOutcome: 2,
  bracket: { r32: 2, r16: 3, qf: 5, sf: 8 } as Record<PredictionBracketRound, number>,
  finalist: 12,
  thirdPlace: 15,
  champion: 30,
  finalExact: 15,
  topScorer: 15,
} as const;

/** Resultados oficiales del torneo, en el formato que consume el scoring. */
export interface OfficialResults {
  /** match_id → marcador final oficial (solo partidos de grupos finalizados). */
  groupScores: Map<string, { home: number; away: number }>;
  /** Equipos que realmente alcanzaron cada ronda eliminatoria. */
  advancers: Record<PredictionBracketRound, Set<string>>;
  /** Los 2 equipos que jugaron la final. */
  finalists: Set<string>;
  /** Marcador oficial de la final (90'), o null si no se ha jugado. */
  finalScore: { home: number; away: number } | null;
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  /** Nombre oficial del goleador del torneo, o null. */
  topScorer: string | null;
}

/** El pronóstico de un usuario, tal como sale de las 3 tablas. */
export interface UserPrediction {
  prediction: Prediction | null;
  groupScores: PredictionGroupScore[];
  bracket: PredictionBracketEntry[];
}

export interface ScoreBreakdown {
  groupExact: number;
  groupExactCount: number;
  groupOutcome: number;
  groupOutcomeCount: number;
  r32: number;
  r16: number;
  qf: number;
  sf: number;
  finalists: number;
  thirdPlace: number;
  champion: number;
  finalExact: number;
  topScorer: number;
  total: number;
}

type Outcome = 'home' | 'away' | 'draw';

function outcome(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

/**
 * Normaliza un nombre de jugador para comparación flexible: sin acentos,
 * minúsculas, espacios colapsados y sin espacios al borde.
 *   "José  MÉNDEZ " → "jose mendez"
 */
export function normalizeScorer(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quitar marcas diacríticas
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeScore(user: UserPrediction, actual: OfficialResults): ScoreBreakdown {
  // ── Fase de grupos ────────────────────────────────────────────────
  let groupExact = 0;
  let groupExactCount = 0;
  let groupOutcome = 0;
  let groupOutcomeCount = 0;

  for (const gs of user.groupScores) {
    const real = actual.groupScores.get(gs.match_id);
    if (!real) continue; // sin resultado oficial todavía → no puntúa
    if (gs.home_score === real.home && gs.away_score === real.away) {
      groupExact += SCORING.groupExact;
      groupExactCount += 1;
    } else if (outcome(gs.home_score, gs.away_score) === outcome(real.home, real.away)) {
      groupOutcome += SCORING.groupOutcome;
      groupOutcomeCount += 1;
    }
  }

  // ── Bracket por ronda ─────────────────────────────────────────────
  const roundPts: Record<PredictionBracketRound, number> = { r32: 0, r16: 0, qf: 0, sf: 0 };
  for (const round of BRACKET_ROUNDS) {
    const actualSet = actual.advancers[round];
    let pts = 0;
    for (const entry of user.bracket) {
      if (entry.round !== round) continue;
      if (actualSet.has(entry.team_code)) pts += SCORING.bracket[round];
    }
    roundPts[round] = pts;
  }

  // ── Finalistas (campeón + subcampeón predichos que llegaron a la final) ──
  let finalistsPts = 0;
  const predictedFinalists = [
    user.prediction?.champion_code,
    user.prediction?.runner_up_code,
  ].filter((c): c is string => !!c);
  for (const code of predictedFinalists) {
    if (actual.finalists.has(code)) finalistsPts += SCORING.finalist;
  }

  // ── Tercer puesto / Campeón ───────────────────────────────────────
  const thirdPts =
    user.prediction?.third_place_code &&
    user.prediction.third_place_code === actual.thirdPlace
      ? SCORING.thirdPlace
      : 0;

  const championPts =
    user.prediction?.champion_code && user.prediction.champion_code === actual.champion
      ? SCORING.champion
      : 0;

  // ── Marcador exacto de la final (bonus) ───────────────────────────
  // El usuario predijo un marcador sin asignar equipos (dos cajas X–Y),
  // así que se compara como par NO ordenado: acertar la "pizarra" basta.
  let finalExactPts = 0;
  const ph = user.prediction?.final_home_score;
  const pa = user.prediction?.final_away_score;
  if (ph != null && pa != null && actual.finalScore) {
    const predPair = [ph, pa].sort((a, b) => a - b);
    const realPair = [actual.finalScore.home, actual.finalScore.away].sort((a, b) => a - b);
    if (predPair[0] === realPair[0] && predPair[1] === realPair[1]) {
      finalExactPts = SCORING.finalExact;
    }
  }

  // ── Goleador (match flexible) ─────────────────────────────────────
  let topScorerPts = 0;
  const predScorer = user.prediction?.top_scorer?.trim();
  if (predScorer && actual.topScorer) {
    if (normalizeScorer(predScorer) === normalizeScorer(actual.topScorer)) {
      topScorerPts = SCORING.topScorer;
    }
  }

  const total =
    groupExact +
    groupOutcome +
    roundPts.r32 +
    roundPts.r16 +
    roundPts.qf +
    roundPts.sf +
    finalistsPts +
    thirdPts +
    championPts +
    finalExactPts +
    topScorerPts;

  return {
    groupExact,
    groupExactCount,
    groupOutcome,
    groupOutcomeCount,
    r32: roundPts.r32,
    r16: roundPts.r16,
    qf: roundPts.qf,
    sf: roundPts.sf,
    finalists: finalistsPts,
    thirdPlace: thirdPts,
    champion: championPts,
    finalExact: finalExactPts,
    topScorer: topScorerPts,
    total,
  };
}

/**
 * Construye los `OfficialResults` a partir de la tabla `matches` (con
 * resultados oficiales cargados) y el goleador oficial. Lo que aún no
 * tenga resultado simplemente no aparece (y por lo tanto no puntúa).
 *
 * Convenciones de la tabla:
 *   - match_number 1-72  → fase de grupos
 *   - 73-88 r32, 89-96 r16, 97-100 qf, 101-102 sf, 103 3er, 104 final
 *   - "clasificados a una ronda" = equipos presentes en los partidos de
 *     esa ronda (home_team/away_team no nulos).
 *   - ganador = mayor marcador; si empatan (no debería en eliminatoria
 *     sin datos de penales) se devuelve null para ese puesto.
 */
export function deriveOfficialResults(
  matches: Match[],
  officialTopScorer: string | null = null,
): OfficialResults {
  const groupScores = new Map<string, { home: number; away: number }>();
  const advancers: Record<PredictionBracketRound, Set<string>> = {
    r32: new Set(),
    r16: new Set(),
    qf: new Set(),
    sf: new Set(),
  };
  const finalists = new Set<string>();
  let finalScore: { home: number; away: number } | null = null;
  let champion: string | null = null;
  let runnerUp: string | null = null;
  let thirdPlace: string | null = null;

  for (const m of matches) {
    const homeCode = m.home_team?.code ?? null;
    const awayCode = m.away_team?.code ?? null;
    const hasScore = m.home_score != null && m.away_score != null;

    if (m.stage === 'group') {
      if (m.status === 'final' && hasScore) {
        groupScores.set(m.id, { home: m.home_score as number, away: m.away_score as number });
      }
      continue;
    }

    // Eliminatorias: registrar clasificados a cada ronda
    if (m.stage === 'r32' || m.stage === 'r16' || m.stage === 'qf' || m.stage === 'sf') {
      if (homeCode) advancers[m.stage].add(homeCode);
      if (awayCode) advancers[m.stage].add(awayCode);
    }

    if (m.stage === 'final') {
      if (homeCode) finalists.add(homeCode);
      if (awayCode) finalists.add(awayCode);
      if (hasScore) {
        finalScore = { home: m.home_score as number, away: m.away_score as number };
        const result = pickWinner(m);
        champion = result.winner;
        runnerUp = result.loser;
      }
    }

    if (m.stage === '3rd' && hasScore) {
      thirdPlace = pickWinner(m).winner;
    }
  }

  return {
    groupScores,
    advancers,
    finalists,
    finalScore,
    champion,
    runnerUp,
    thirdPlace,
    topScorer: officialTopScorer,
  };
}

/** Ganador/perdedor de un partido eliminatorio por marcador. Empate → null. */
function pickWinner(m: Match): { winner: string | null; loser: string | null } {
  const home = m.home_team?.code ?? null;
  const away = m.away_team?.code ?? null;
  if (m.home_score == null || m.away_score == null) return { winner: null, loser: null };
  if (m.home_score > m.away_score) return { winner: home, loser: away };
  if (m.home_score < m.away_score) return { winner: away, loser: home };
  return { winner: null, loser: null }; // empate sin datos de penales
}

/** Entrada del ranking: el desglose de puntos de un usuario. */
export interface RankingEntry {
  userId: string;
  breakdown: ScoreBreakdown;
}

/**
 * Agrupa las predicciones de todos los usuarios y calcula el puntaje de
 * cada uno contra los resultados oficiales. Devuelve la lista ordenada
 * de mayor a menor puntaje (desempate alfabético por userId, estable;
 * el orden de presentación final lo decide la vista con los nombres).
 *
 * Función pura — recibe arrays planos (tal como salen de las tablas) y
 * los OfficialResults ya derivados.
 */
export function buildRanking(
  predictions: Prediction[],
  groupScores: PredictionGroupScore[],
  bracket: PredictionBracketEntry[],
  official: OfficialResults,
): RankingEntry[] {
  const byUser = new Map<string, UserPrediction>();
  const ensure = (userId: string): UserPrediction => {
    let up = byUser.get(userId);
    if (!up) {
      up = { prediction: null, groupScores: [], bracket: [] };
      byUser.set(userId, up);
    }
    return up;
  };

  for (const p of predictions) ensure(p.user_id).prediction = p;
  for (const s of groupScores) ensure(s.user_id).groupScores.push(s);
  for (const b of bracket) ensure(b.user_id).bracket.push(b);

  const entries: RankingEntry[] = Array.from(byUser.entries()).map(([userId, up]) => ({
    userId,
    breakdown: computeScore(up, official),
  }));

  entries.sort((a, b) => b.breakdown.total - a.breakdown.total || a.userId.localeCompare(b.userId));
  return entries;
}
