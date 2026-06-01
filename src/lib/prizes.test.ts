import { describe, it, expect } from 'vitest';
import { computePrizes, ENROLLMENT_COST_COP } from './prizes';

describe('computePrizes', () => {
  it('0 inscritos → todo en cero', () => {
    const p = computePrizes(0);
    expect(p).toEqual({ pot: 0, adminCut: 0, prizePool: 0, podium: [0, 0, 0] });
  });

  it('10 inscritos: 10% admin y reparto 70/20/10', () => {
    const p = computePrizes(10); // 10 × 50.000 = 500.000
    expect(p.pot).toBe(500000);
    expect(p.adminCut).toBe(50000); // 10%
    expect(p.prizePool).toBe(450000); // 90%
    expect(p.podium).toEqual([315000, 90000, 45000]); // 70 / 20 / 10
  });

  it('el podio siempre suma exactamente el pozo de premios (redondeo al 1°)', () => {
    for (const n of [1, 3, 7, 11, 13, 27, 50, 99]) {
      const p = computePrizes(n);
      expect(p.podium[0] + p.podium[1] + p.podium[2]).toBe(p.prizePool);
      expect(p.adminCut + p.prizePool).toBe(p.pot);
      expect(p.podium[0]).toBeGreaterThanOrEqual(p.podium[1]);
      expect(p.podium[1]).toBeGreaterThanOrEqual(p.podium[2]);
    }
  });

  it('un inscrito recauda el costo configurado', () => {
    expect(computePrizes(1).pot).toBe(ENROLLMENT_COST_COP);
  });

  it('ignora valores negativos o fraccionarios', () => {
    expect(computePrizes(-5).pot).toBe(0);
    expect(computePrizes(2.9).pot).toBe(2 * ENROLLMENT_COST_COP);
  });
});
