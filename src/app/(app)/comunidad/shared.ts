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

/** Nombre a mostrar: "Nombre Apellidos", con fallback a nickname. */
export function displayName(p: {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
}): string {
  const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return full || p.nickname || 'Jugador';
}
