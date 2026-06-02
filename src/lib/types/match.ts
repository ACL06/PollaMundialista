export interface Team {
  code: string;
  name: string;
  flag: string;
  group_code: string | null;
}

export type MatchStatus = 'scheduled' | 'live' | 'final';
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';

export interface Match {
  id: string;
  match_number: number;
  stage: MatchStage;
  group_code: string | null;
  /** Null en eliminatorias hasta que se conozca el equipo (después de la ronda previa). */
  home_team: Team | null;
  /** Null en eliminatorias hasta que se conozca el equipo (después de la ronda previa). */
  away_team: Team | null;
  /**
   * Metadata del bracket: de dónde sale el equipo local de un partido eliminatorio.
   * Ej: '1A' = campeón Grupo A, '2B' = segundo Grupo B, '3ABCDF' = mejor 3° de A/B/C/D/F,
   * 'W73' = ganador del match 73, 'L101' = perdedor del 101.
   * Null en partidos de fase de grupos.
   */
  bracket_source_home: string | null;
  /** Igual a bracket_source_home pero para el visitante. */
  bracket_source_away: string | null;
  kicks_off_at: string;
  venue: string;
  home_score: number | null;
  away_score: number | null;
  /**
   * Ganador declarado por el admin para final/3er lugar (campeón / 3er
   * puesto), útil cuando el 90' terminó en empate y se definió por penales.
   * Si es null, el ganador se infiere del marcador a los 90'.
   */
  winner_code: string | null;
  status: MatchStatus;
}
