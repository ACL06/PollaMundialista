/**
 * Convierte el código de "fuente" del bracket a un texto humano en español,
 * siguiendo el estilo de los grandes calendarios (ESPN/FIFA) pero traducido.
 *
 * Códigos soportados:
 *   - "1A", "2B"   → "Ganador Grupo A", "Segundo Lugar Grupo B"
 *   - "3ABCDF"     → "Tercer Lugar Grupos A/B/C/D/F"
 *   - "W73"        → "Ganador Dieciseisavos de Final" (sin número de partido)
 *   - "L101"       → "Perdedor Semifinales"
 *
 * Para W/L derivamos la ronda anterior a partir del rango del `match_number`:
 *   73-88 → Dieciseisavos de Final, 89-96 → Octavos de Final,
 *   97-100 → Cuartos de Final,      101-102 → Semifinales.
 *
 * Si el código no calza con ningún patrón conocido, se devuelve tal cual
 * (defensivo: la BD podría tener algo nuevo que la UI todavía no entiende).
 */
export function formatBracketSource(source: string): string {
  // "1A" / "2B" — posición dentro de un grupo, estilo ESPN
  const positionMatch = source.match(/^([12])([A-L])$/);
  if (positionMatch) {
    const [, position, group] = positionMatch;
    const label = position === '1' ? 'Ganador' : 'Segundo Lugar';
    return `${label} Grupo ${group}`;
  }

  // "3ABCDF" — mejor tercero entre varios grupos
  const thirdMatch = source.match(/^3([A-L]+)$/);
  if (thirdMatch) {
    const groups = thirdMatch[1].split('').join('/');
    return `Tercer Lugar Grupos ${groups}`;
  }

  // "W73" / "L101" — referencia al ganador/perdedor de otro partido.
  // El número se omite por preferencia de UX; la ronda se infiere del rango.
  const refMatch = source.match(/^([WL])(\d+)$/);
  if (refMatch) {
    const [, kind, numStr] = refMatch;
    const num = parseInt(numStr, 10);
    const label = kind === 'W' ? 'Ganador' : 'Perdedor';
    const round = roundLabelFromMatchNumber(num);
    return round ? `${label} ${round}` : `${label} partido ${num}`;
  }

  return source;
}

/** Mapea el match_number del partido de origen al nombre de su ronda. */
function roundLabelFromMatchNumber(num: number): string | null {
  if (num >= 73 && num <= 88) return 'Dieciseisavos de Final';
  if (num >= 89 && num <= 96) return 'Octavos de Final';
  if (num >= 97 && num <= 100) return 'Cuartos de Final';
  if (num >= 101 && num <= 102) return 'Semifinales';
  return null;
}
