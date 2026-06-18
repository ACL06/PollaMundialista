import type { Match, Team } from '@/lib/types/match';

/** Stats de un equipo en su grupo. */
export interface Standing {
  team: Team;
  played: number; // PJ
  wins: number; // G
  draws: number; // E
  losses: number; // P
  goalsFor: number; // GF
  goalsAgainst: number; // GC
  goalDifference: number; // DG
  points: number; // Pts
}

/**
 * Calcula la tabla de posiciones por grupo a partir de los partidos
 * finalizados. Solo cuentan partidos con `stage='group'`, `status='final'`
 * y ambos scores no null. Los demás se ignoran (no afectan stats).
 *
 * Devuelve un Map<group_code, Standing[]>, donde cada arreglo viene
 * ordenado por el tie-breaker FIFA simplificado:
 *   1. Más puntos
 *   2. Mejor diferencia de goles
 *   3. Más goles a favor
 *   4. Orden alfabético (fallback determinista)
 */
export function computeGroupStandings(
  matches: Match[],
  teams: Team[],
): Map<string, Standing[]> {
  const byGroup = new Map<string, Standing[]>();

  // Inicializa cada equipo con stats en 0 (incluso si no ha jugado)
  for (const team of teams) {
    if (!team.group_code) continue;
    const empty: Standing = {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
    if (!byGroup.has(team.group_code)) byGroup.set(team.group_code, []);
    byGroup.get(team.group_code)!.push(empty);
  }

  // Indexa standings por código de equipo para lookup rápido
  const byTeam = new Map<string, Standing>();
  for (const [, list] of byGroup) {
    for (const s of list) byTeam.set(s.team.code, s);
  }

  // Agrega stats de cada partido finalizado de fase de grupos
  for (const m of matches) {
    if (m.stage !== 'group') continue;
    if (m.status !== 'final') continue;
    if (m.home_score === null || m.away_score === null) continue;
    if (!m.home_team || !m.away_team) continue;

    const home = byTeam.get(m.home_team.code);
    const away = byTeam.get(m.away_team.code);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.home_score;
    home.goalsAgainst += m.away_score;
    away.goalsFor += m.away_score;
    away.goalsAgainst += m.home_score;

    if (m.home_score > m.away_score) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (m.home_score < m.away_score) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  // Recalcula DG y ordena cada grupo por el tie-breaker
  for (const [, standings] of byGroup) {
    for (const s of standings) {
      s.goalDifference = s.goalsFor - s.goalsAgainst;
    }
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.name.localeCompare(b.team.name);
    });
  }

  return byGroup;
}

/**
 * Override manual de posiciones que define el admin (tabla `group_standings`).
 * Solo afecta el DISPLAY de `/grupos`; el scoring de clasificados se deriva
 * aparte (de los equipos asignados a los cruces de R32).
 */
export interface GroupStandingOverride {
  team_code: string;
  position: number; // 1-4 dentro del grupo
  third_qualifies: boolean; // marca al 3° que clasifica como mejor tercero
}

/** Standing + si el equipo clasifica a la siguiente ronda (1°, 2° o 3° elegido). */
export interface RankedStanding extends Standing {
  position: number;
  qualifies: boolean;
}

/**
 * Aplica el override del admin a las standings calculadas de UN grupo:
 *   - Si los 4 equipos tienen override → ordena por la posición manual;
 *     si no, conserva el orden automático (el tie-break simplificado).
 *   - `qualifies` = posición 1 o 2, o posición 3 marcada como mejor tercero.
 * El orden de entrada es el de `computeGroupStandings` (ya ordenado).
 */
export function rankGroup(
  standings: Standing[],
  overrideByTeam: Map<string, GroupStandingOverride>,
): RankedStanding[] {
  const allOverridden =
    standings.length > 0 && standings.every((s) => overrideByTeam.has(s.team.code));

  const ordered = allOverridden
    ? [...standings].sort(
        (a, b) =>
          overrideByTeam.get(a.team.code)!.position - overrideByTeam.get(b.team.code)!.position,
      )
    : standings;

  return ordered.map((s, i) => {
    const ov = overrideByTeam.get(s.team.code);
    const position = allOverridden ? ov!.position : i + 1;
    const qualifies = position <= 2 || (position === 3 && (ov?.third_qualifies ?? false));
    return { ...s, position, qualifies };
  });
}
