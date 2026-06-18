import { describe, it, expect } from 'vitest';
import {
  computeGroupStandings,
  rankGroup,
  type GroupStandingOverride,
  type Standing,
} from './compute-standings';
import type { Match, Team } from '@/lib/types/match';

function team(code: string, group: string): Team {
  return { code, name: code, flag: 'xx', group_code: group };
}

let counter = 0;
function finalMatch(home: Team, away: Team, hs: number, as: number, group: string): Match {
  counter += 1;
  return {
    id: `m${counter}`,
    match_number: counter,
    stage: 'group',
    group_code: group,
    home_team: home,
    away_team: away,
    bracket_source_home: null,
    bracket_source_away: null,
    kicks_off_at: '2026-06-11T19:00:00Z',
    venue: 'X',
    home_score: hs,
    away_score: as,
    status: 'final',
  } as Match;
}

describe('computeGroupStandings', () => {
  it('cuenta puntos, G/E/P y goles correctamente', () => {
    const A = team('AAA', 'A');
    const B = team('BBB', 'A');
    const teams = [A, B];
    // AAA gana 2-0
    const standings = computeGroupStandings([finalMatch(A, B, 2, 0, 'A')], teams);
    const groupA = standings.get('A')!;
    const aaa = groupA.find((s) => s.team.code === 'AAA')!;
    const bbb = groupA.find((s) => s.team.code === 'BBB')!;

    expect(aaa.points).toBe(3);
    expect(aaa.wins).toBe(1);
    expect(aaa.goalsFor).toBe(2);
    expect(aaa.goalsAgainst).toBe(0);
    expect(aaa.goalDifference).toBe(2);

    expect(bbb.points).toBe(0);
    expect(bbb.losses).toBe(1);
    expect(bbb.goalDifference).toBe(-2);
  });

  it('un empate da 1 punto a cada uno', () => {
    const A = team('AAA', 'A');
    const B = team('BBB', 'A');
    const s = computeGroupStandings([finalMatch(A, B, 1, 1, 'A')], [A, B]);
    const g = s.get('A')!;
    expect(g.every((row) => row.points === 1 && row.draws === 1)).toBe(true);
  });

  it('ordena por puntos → diferencia de gol → goles a favor → alfabético', () => {
    const A = team('AAA', 'A');
    const B = team('BBB', 'A');
    const C = team('CCC', 'A');
    // Todos con 3 pts (cada uno gana uno): forzamos distinta DG/GF.
    // AAA gana 3-0 a BBB; BBB gana 1-0 a CCC; CCC gana 2-0 a AAA.
    const matches = [
      finalMatch(A, B, 3, 0, 'A'),
      finalMatch(B, C, 1, 0, 'A'),
      finalMatch(C, A, 2, 0, 'A'),
    ];
    const g = computeGroupStandings(matches, [A, B, C]).get('A')!;
    // Todos 3 pts. DG: AAA 3-2=+1, BBB 1-3=-2, CCC 2-1=+1. GF: AAA 3, CCC 2.
    // Orden: AAA (DG+1, GF3), CCC (DG+1, GF2), BBB (DG-2).
    expect(g.map((s) => s.team.code)).toEqual(['AAA', 'CCC', 'BBB']);
  });

  it('ignora partidos no finalizados, sin marcador o que no son de grupos', () => {
    const A = team('AAA', 'A');
    const B = team('BBB', 'A');
    const scheduled = { ...finalMatch(A, B, 9, 9, 'A'), status: 'scheduled' } as Match;
    const nullScore = { ...finalMatch(A, B, 0, 0, 'A'), home_score: null } as Match;
    const r32 = { ...finalMatch(A, B, 5, 0, 'A'), stage: 'r32' } as Match;
    const g = computeGroupStandings([scheduled, nullScore, r32], [A, B]).get('A')!;
    expect(g.every((s) => s.played === 0 && s.points === 0)).toBe(true);
  });

  it('los equipos sin jugar aparecen en su grupo con stats en 0', () => {
    const A = team('AAA', 'A');
    const B = team('BBB', 'A');
    const g = computeGroupStandings([], [A, B]).get('A')!;
    expect(g).toHaveLength(2);
    expect(g.every((s) => s.played === 0)).toBe(true);
  });
});

describe('rankGroup (override del admin)', () => {
  const mk = (code: string): Standing => ({
    team: team(code, 'A'),
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  });
  // Orden automático de entrada: A, B, C, D.
  const auto = [mk('A'), mk('B'), mk('C'), mk('D')];

  it('sin override: conserva el orden y clasifican 1° y 2°', () => {
    const r = rankGroup(auto, new Map());
    expect(r.map((s) => s.team.code)).toEqual(['A', 'B', 'C', 'D']);
    expect(r.map((s) => s.qualifies)).toEqual([true, true, false, false]);
  });

  it('override completo: reordena por la posición manual', () => {
    const ov = new Map<string, GroupStandingOverride>([
      ['A', { team_code: 'A', position: 3, third_qualifies: false }],
      ['B', { team_code: 'B', position: 1, third_qualifies: false }],
      ['C', { team_code: 'C', position: 2, third_qualifies: false }],
      ['D', { team_code: 'D', position: 4, third_qualifies: false }],
    ]);
    const r = rankGroup(auto, ov);
    expect(r.map((s) => s.team.code)).toEqual(['B', 'C', 'A', 'D']);
    // Clasifican B(1°), C(2°); A es 3° sin marcar → no clasifica.
    expect(r.map((s) => s.qualifies)).toEqual([true, true, false, false]);
  });

  it('tercero marcado clasifica', () => {
    const ov = new Map<string, GroupStandingOverride>([
      ['A', { team_code: 'A', position: 1, third_qualifies: false }],
      ['B', { team_code: 'B', position: 2, third_qualifies: false }],
      ['C', { team_code: 'C', position: 3, third_qualifies: true }],
      ['D', { team_code: 'D', position: 4, third_qualifies: false }],
    ]);
    const r = rankGroup(auto, ov);
    expect(r.find((s) => s.team.code === 'C')!.qualifies).toBe(true);
    expect(r.find((s) => s.team.code === 'D')!.qualifies).toBe(false);
  });

  it('override parcial (no todos los equipos): usa el orden automático', () => {
    const ov = new Map<string, GroupStandingOverride>([
      ['A', { team_code: 'A', position: 4, third_qualifies: false }],
    ]);
    const r = rankGroup(auto, ov);
    expect(r.map((s) => s.team.code)).toEqual(['A', 'B', 'C', 'D']); // sin reordenar
  });
});
