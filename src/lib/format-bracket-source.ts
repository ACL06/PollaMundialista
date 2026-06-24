/**
 * Convierte el código de "fuente" del bracket a un texto humano en español,
 * siguiendo el estilo de los grandes calendarios (ESPN/FIFA) pero traducido.
 *
 * Códigos soportados:
 *   - "1A", "2B"   → "Ganador Grupo A", "Segundo Lugar Grupo B"
 *   - "3ABCDF"     → "Tercer Lugar Grupos A/B/C/D/F"
 *   - "W73"        → "Ganador del partido 73"
 *   - "L101"       → "Perdedor del partido 101"
 *
 * Para W/L mostramos el NÚMERO del partido de origen (estilo FIFA "W73"):
 * la ronda genérica ("Ganador Octavos de Final") no distinguía de qué cruce
 * venía cada equipo —dos slots de un mismo partido se veían idénticos—, que es
 * justo lo que el bracket necesita comunicar.
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

  // "W73" / "L101" — ganador/perdedor de un partido específico, por número.
  const refMatch = source.match(/^([WL])(\d+)$/);
  if (refMatch) {
    const [, kind, numStr] = refMatch;
    const label = kind === 'W' ? 'Ganador' : 'Perdedor';
    return `${label} del partido ${parseInt(numStr, 10)}`;
  }

  return source;
}
