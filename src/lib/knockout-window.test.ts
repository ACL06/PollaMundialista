import { describe, it, expect } from 'vitest';
import {
  KNOCKOUT_SCORE_STAGES,
  isKnockoutScoreStage,
  knockoutMatchState,
} from './knockout-window';
import type { Match, Team } from '@/lib/types/match';

function team(code: string): Team {
  return { code, name: code, flag: 'xx', group_code: null };
}

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm',
    match_number: 73,
    stage: 'r32',
    group_code: null,
    home_team: team('AAA'),
    away_team: team('BBB'),
    bracket_source_home: null,
    bracket_source_away: null,
    kicks_off_at: '2026-06-28T19:00:00Z',
    venue: 'X',
    home_score: null,
    away_score: null,
    status: 'scheduled',
    ...overrides,
  };
}

describe('isKnockoutScoreStage', () => {
  it('incluye R32, Octavos, Cuartos, Semi y Tercer lugar', () => {
    expect(KNOCKOUT_SCORE_STAGES).toEqual(['r32', 'r16', 'qf', 'sf', '3rd']);
    for (const s of KNOCKOUT_SCORE_STAGES) {
      expect(isKnockoutScoreStage(s)).toBe(true);
    }
  });

  it('excluye fase de grupos y la final (la final tiene su bonus aparte)', () => {
    expect(isKnockoutScoreStage('group')).toBe(false);
    expect(isKnockoutScoreStage('final')).toBe(false);
  });
});

describe('knockoutMatchState', () => {
  const now = new Date('2026-06-28T12:00:00Z');

  it('pending cuando falta algún equipo', () => {
    expect(knockoutMatchState(match({ home_team: null }), now)).toBe('pending');
    expect(knockoutMatchState(match({ away_team: null }), now)).toBe('pending');
    expect(knockoutMatchState(match({ home_team: null, away_team: null }), now)).toBe('pending');
  });

  it('open cuando hay equipos y aún no arranca', () => {
    // kickoff 19:00, ahora 12:00 del mismo día
    expect(knockoutMatchState(match(), now)).toBe('open');
  });

  it('closed cuando el partido ya arrancó', () => {
    const after = new Date('2026-06-28T19:00:01Z');
    expect(knockoutMatchState(match(), after)).toBe('closed');
  });

  it('closed exactamente en el kickoff (cierre inclusivo)', () => {
    const atKickoff = new Date('2026-06-28T19:00:00Z');
    expect(knockoutMatchState(match(), atKickoff)).toBe('closed');
  });

  it('cada partido es independiente: uno cerrado no afecta a otro abierto', () => {
    const early = match({ id: 'a', kicks_off_at: '2026-06-28T11:00:00Z' }); // ya arrancó
    const late = match({ id: 'b', kicks_off_at: '2026-06-28T20:00:00Z' }); // aún no
    expect(knockoutMatchState(early, now)).toBe('closed');
    expect(knockoutMatchState(late, now)).toBe('open');
  });
});
