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
}

export interface CommunityScore {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
}

export interface ChampionPick {
  user_id: string;
  champion_code: string | null;
}

export type ReactionKey = 'like' | 'laugh' | 'fire' | 'shock';

/** Set de reacciones disponibles (orden de display). */
export const REACTIONS: ReadonlyArray<{ key: ReactionKey; emoji: string; label: string }> = [
  { key: 'like', emoji: '👍', label: 'Me gusta' },
  { key: 'laugh', emoji: '😂', label: 'Jaja' },
  { key: 'fire', emoji: '🔥', label: 'Crack' },
  { key: 'shock', emoji: '😱', label: 'No way' },
];

export const REACTION_EMOJI: Record<ReactionKey, string> = {
  like: '👍',
  laugh: '😂',
  fire: '🔥',
  shock: '😱',
};

export interface ReactionRow {
  reactor_id: string;
  target_user_id: string;
  match_id: string;
  reaction: ReactionKey;
}

/** Nombre a mostrar: "Nombre Apellidos", con fallback a nickname. */
export function displayName(p: {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
}): string {
  const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return full || p.nickname || 'Jugador';
}
