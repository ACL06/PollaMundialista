import { describe, it, expect } from 'vitest';
import {
  DAILY_FACTS,
  CATEGORY_LABEL,
  getDailyFact,
  type FactCategory,
} from './daily-facts';

describe('DAILY_FACTS (contenido)', () => {
  it('tiene exactamente 40 datos', () => {
    expect(DAILY_FACTS).toHaveLength(40);
  });

  it('respeta la mezcla de categorías acordada', () => {
    const counts = DAILY_FACTS.reduce<Record<string, number>>((acc, f) => {
      acc[f.category] = (acc[f.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({
      historia: 10,
      records: 8,
      jugadores: 8,
      curiosidades: 6,
      selecciones: 4,
      'mundial-2026': 4,
    });
  });

  it('no repite categoría en días consecutivos (variedad)', () => {
    for (let i = 1; i < DAILY_FACTS.length; i++) {
      expect(DAILY_FACTS[i].category, `días ${i} y ${i + 1}`).not.toBe(
        DAILY_FACTS[i - 1].category,
      );
    }
  });

  it('todo dato tiene texto y fuente, y categoría válida', () => {
    const validCategories = Object.keys(CATEGORY_LABEL) as FactCategory[];
    for (const f of DAILY_FACTS) {
      expect(f.text.trim().length).toBeGreaterThan(0);
      expect(f.source.trim().length).toBeGreaterThan(0);
      expect(validCategories).toContain(f.category);
    }
  });
});

describe('getDailyFact', () => {
  // Ancla = arranque del torneo. Kickoff de tarde en Bogotá: 18:00 del 11/06
  // (= 23:00 UTC). El día Bogotá del ancla es 2026-06-11.
  const anchor = new Date('2026-06-11T23:00:00Z');

  it('devuelve null si no hay ancla (lock sin resolver)', () => {
    expect(getDailyFact(new Date('2026-06-15T17:00:00Z'), null)).toBeNull();
  });

  it('el día del ancla es el Día 1 (sin importar la hora del kickoff)', () => {
    const r = getDailyFact(anchor, anchor);
    expect(r).not.toBeNull();
    expect(r!.day).toBe(1);
    expect(r!.total).toBe(40);
    expect(r!.text).toBe(DAILY_FACTS[0].text);
    expect(r!.categoryLabel).toBe(CATEGORY_LABEL[DAILY_FACTS[0].category]);
  });

  it('sigue en Día 1 hasta la medianoche de Bogotá, no la de UTC', () => {
    // 2026-06-12T00:30Z = 11/06 19:30 en Bogotá → todavía Día 1.
    // (Un cálculo ingenuo en UTC diría Día 2: esta es la prueba antibug de TZ.)
    expect(getDailyFact(new Date('2026-06-12T00:30:00Z'), anchor)!.day).toBe(1);
    // 2026-06-12T04:59Z = 11/06 23:59 Bogotá → Día 1.
    expect(getDailyFact(new Date('2026-06-12T04:59:00Z'), anchor)!.day).toBe(1);
    // 2026-06-12T05:00Z = 12/06 00:00 Bogotá → recién ahí pasa a Día 2.
    expect(getDailyFact(new Date('2026-06-12T05:00:00Z'), anchor)!.day).toBe(2);
  });

  it('mapea Día N → DAILY_FACTS[N-1]', () => {
    // Día 12 = 11/06 + 11 días = 22/06 (mediodía Bogotá).
    const r = getDailyFact(new Date('2026-06-22T17:00:00Z'), anchor);
    expect(r!.day).toBe(12);
    expect(r!.text).toBe(DAILY_FACTS[11].text);
  });

  it('el Día 40 es el último dato', () => {
    // Día 40 = 11/06 + 39 días = 20/07.
    const r = getDailyFact(new Date('2026-07-20T17:00:00Z'), anchor);
    expect(r!.day).toBe(40);
    expect(r!.text).toBe(DAILY_FACTS[39].text);
  });

  it('pasado el Día 40 ya no muestra nada (torneo terminado)', () => {
    expect(getDailyFact(new Date('2026-07-21T17:00:00Z'), anchor)).toBeNull();
  });

  it('antes del ancla devuelve null', () => {
    expect(getDailyFact(new Date('2026-06-10T17:00:00Z'), anchor)).toBeNull();
  });
});
