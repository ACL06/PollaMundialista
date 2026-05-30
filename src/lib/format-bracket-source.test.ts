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

  it('ganador/perdedor con ronda inferida por match_number', () => {
    expect(formatBracketSource('W73')).toBe('Ganador Dieciseisavos de Final');
    expect(formatBracketSource('W88')).toBe('Ganador Dieciseisavos de Final');
    expect(formatBracketSource('W89')).toBe('Ganador Octavos de Final');
    expect(formatBracketSource('W96')).toBe('Ganador Octavos de Final');
    expect(formatBracketSource('W97')).toBe('Ganador Cuartos de Final');
    expect(formatBracketSource('W100')).toBe('Ganador Cuartos de Final');
    expect(formatBracketSource('W101')).toBe('Ganador Semifinales');
    expect(formatBracketSource('L101')).toBe('Perdedor Semifinales');
    expect(formatBracketSource('L102')).toBe('Perdedor Semifinales');
  });

  it('match_number fuera de rango conocido cae a "partido N"', () => {
    expect(formatBracketSource('W50')).toBe('Ganador partido 50');
    expect(formatBracketSource('L120')).toBe('Perdedor partido 120');
  });

  it('código desconocido se devuelve tal cual', () => {
    expect(formatBracketSource('XYZ')).toBe('XYZ');
    expect(formatBracketSource('9Z')).toBe('9Z');
  });
});
