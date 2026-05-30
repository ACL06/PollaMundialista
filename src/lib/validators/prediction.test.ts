import { describe, it, expect } from 'vitest';
import { groupScoreSchema, bracketToggleSchema, predictionMetaSchema } from './prediction';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('groupScoreSchema', () => {
  it('acepta marcadores válidos 0-99', () => {
    expect(groupScoreSchema.safeParse({ match_id: UUID, home_score: 2, away_score: 1 }).success).toBe(true);
    expect(groupScoreSchema.safeParse({ match_id: UUID, home_score: 0, away_score: 99 }).success).toBe(true);
  });

  it('rechaza fuera de rango, negativos y no enteros', () => {
    expect(groupScoreSchema.safeParse({ match_id: UUID, home_score: 100, away_score: 0 }).success).toBe(false);
    expect(groupScoreSchema.safeParse({ match_id: UUID, home_score: -1, away_score: 0 }).success).toBe(false);
    expect(groupScoreSchema.safeParse({ match_id: UUID, home_score: 1.5, away_score: 0 }).success).toBe(false);
  });

  it('rechaza match_id no-uuid', () => {
    expect(groupScoreSchema.safeParse({ match_id: 'abc', home_score: 1, away_score: 0 }).success).toBe(false);
  });
});

describe('bracketToggleSchema', () => {
  it('acepta ronda + código + selected válidos', () => {
    expect(bracketToggleSchema.safeParse({ round: 'r32', team_code: 'BRA', selected: true }).success).toBe(true);
    expect(bracketToggleSchema.safeParse({ round: 'sf', team_code: 'ENG', selected: false }).success).toBe(true);
  });

  it('rechaza ronda inválida y código mal formado', () => {
    expect(bracketToggleSchema.safeParse({ round: 'final', team_code: 'BRA', selected: true }).success).toBe(false);
    expect(bracketToggleSchema.safeParse({ round: 'r32', team_code: 'brasil', selected: true }).success).toBe(false);
    expect(bracketToggleSchema.safeParse({ round: 'r32', team_code: 'B1', selected: true }).success).toBe(false);
  });
});

describe('predictionMetaSchema', () => {
  it('acepta campos parciales (todos opcionales/nullable)', () => {
    expect(predictionMetaSchema.safeParse({}).success).toBe(true);
    expect(predictionMetaSchema.safeParse({ champion_code: 'BRA' }).success).toBe(true);
    expect(predictionMetaSchema.safeParse({ champion_code: null, top_scorer: null }).success).toBe(true);
    expect(predictionMetaSchema.safeParse({ final_home_score: 2, final_away_score: 1 }).success).toBe(true);
  });

  it('rechaza marcador final fuera de rango y goleador muy largo', () => {
    expect(predictionMetaSchema.safeParse({ final_home_score: 100 }).success).toBe(false);
    expect(predictionMetaSchema.safeParse({ top_scorer: 'x'.repeat(81) }).success).toBe(false);
  });
});
