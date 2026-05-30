/**
 * Nombre a mostrar de un usuario: "Nombre Apellidos", con fallback a
 * nickname y luego a "Jugador". Usado en Comunidad y Ranking.
 */
export function displayName(p: {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
}): string {
  const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return full || p.nickname || 'Jugador';
}
