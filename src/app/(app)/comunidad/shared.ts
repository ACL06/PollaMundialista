/**
 * Tipos y helpers compartidos por la página (server) y la vista (client)
 * de Comunidad. Vive aparte de `page.tsx` para no arrastrar imports
 * server-only (next/headers) al bundle del cliente.
 */

export interface PublicProfile {
  id: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  favorite_team: string | null;
  is_enrolled: boolean;
}

export interface CommunityScore {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
}

export interface PredictionPick {
  user_id: string;
  champion_code: string | null;
  runner_up_code: string | null;
  top_scorer: string | null;
}

export type ReactionKey =
  | 'like'
  | 'laugh'
  | 'fire'
  | 'shock'
  | 'dislike'
  | 'eyes'
  | 'clap'
  | 'love';

/** Set de reacciones disponibles (orden de display). Debe coincidir con el
 *  CHECK de `prediction_reactions.reaction` en la BD. */
export const REACTIONS: ReadonlyArray<{ key: ReactionKey; emoji: string; label: string }> = [
  { key: 'like', emoji: '👍', label: 'Me gusta' },
  { key: 'dislike', emoji: '👎', label: 'No me gusta' },
  { key: 'laugh', emoji: '😂', label: 'Jaja' },
  { key: 'fire', emoji: '🔥', label: 'Crack' },
  { key: 'shock', emoji: '😱', label: 'No way' },
  { key: 'eyes', emoji: '👀', label: 'Atento' },
  { key: 'clap', emoji: '👏', label: 'Aplausos' },
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
];

export const REACTION_EMOJI: Record<ReactionKey, string> = {
  like: '👍',
  dislike: '👎',
  laugh: '😂',
  fire: '🔥',
  shock: '😱',
  eyes: '👀',
  clap: '👏',
  love: '❤️',
};

export interface ReactionRow {
  reactor_id: string;
  target_user_id: string;
  match_id: string;
  reaction: ReactionKey;
}

// displayName vive en lib/ (lo comparten Comunidad y Ranking). Se
// re-exporta aquí para no romper los imports existentes de Comunidad.
export { displayName } from '@/lib/display-name';
