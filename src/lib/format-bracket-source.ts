/**
 * Convierte el código de "fuente" del bracket a un texto humano en español.
 *
 * Códigos soportados:
 *   - "1A", "2B"   → "1° Grupo A", "2° Grupo B"
 *   - "3ABCDF"     → "Mejor 3° (A, B, C, D, F)"
 *   - "W73"        → "Ganador partido 73"
 *   - "L101"       → "Perdedor partido 101"
 *
 * Si el código no calza con ningún patrón conocido, se devuelve tal cual
 * (defensivo: la BD podría tener algo nuevo que la UI todavía no entiende).
 */
export function formatBracketSource(source: string): string {
  // "1A" / "2B" — posición dentro de un grupo
  const positionMatch = source.match(/^([12])([A-L])$/);
  if (positionMatch) {
    const [, position, group] = positionMatch;
    const label = position === '1' ? '1°' : '2°';
    return `${label} Grupo ${group}`;
  }

  // "3ABCDF" — mejor tercero entre varios grupos
  const thirdMatch = source.match(/^3([A-L]+)$/);
  if (thirdMatch) {
    // Formato compacto con slash para que entre en una columna estrecha:
    // "3° de A/B/C/D/F" en vez del más largo "Mejor 3° (A, B, C, D, F)".
    const groups = thirdMatch[1].split('').join('/');
    return `3° de ${groups}`;
  }

  // "W73" / "L101" — referencia a otro partido
  const refMatch = source.match(/^([WL])(\d+)$/);
  if (refMatch) {
    const [, kind, num] = refMatch;
    const label = kind === 'W' ? 'Ganador' : 'Perdedor';
    return `${label} #${num}`;
  }

  return source;
}
