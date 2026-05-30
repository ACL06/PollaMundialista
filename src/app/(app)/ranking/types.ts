import type { ScoreBreakdown } from '@/lib/scoring';

/** Fila del ranking lista para presentar (con nombre, avatar y posición). */
export interface RankingRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  breakdown: ScoreBreakdown;
  /** Posición (ranking de competición: empates comparten número). */
  rank: number;
}
