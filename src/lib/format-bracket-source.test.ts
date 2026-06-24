import { describe, it, expect } from 'vitest';
import { formatBracketSource } from './format-bracket-source';

describe('formatBracketSource', () => {
  it('posición en grupo', () => {
    expect(formatBracketSource('1A')).toBe('Ganador Grupo A');
    expect(formatBracketSource('2B')).toBe('Segundo Lugar Grupo B');
    expect(formatBracketSource('1L')).toBe('Ganador Grupo L');
  });

  it('mejor tercero entre grupos', () => {
    expect(formatBracketSource('3ABCDF')).toBe('Tercer Lugar Grupos A/B/C/D/F');
    expect(formatBracketSource('3CDFGH')).toBe('Tercer Lugar Grupos C/D/F/G/H');
  });

  it('ganador/perdedor muestran el número del partido de origen (estilo FIFA)', () => {
    expect(formatBracketSource('W73')).toBe('Ganador del partido 73');
    expect(formatBracketSource('W75')).toBe('Ganador del partido 75');
    expect(formatBracketSource('W89')).toBe('Ganador del partido 89');
    expect(formatBracketSource('W101')).toBe('Ganador del partido 101');
    expect(formatBracketSource('L101')).toBe('Perdedor del partido 101');
    expect(formatBracketSource('L102')).toBe('Perdedor del partido 102');
  });

  it('código desconocido se devuelve tal cual', () => {
    expect(formatBracketSource('XYZ')).toBe('XYZ');
    expect(formatBracketSource('9Z')).toBe('9Z');
  });
});
