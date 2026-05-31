import { describe, it, expect } from 'vitest';
import {
  buildRanking,
  computeScore,
  deriveOfficialResults,
  normalizeScorer,
  SCORING,
  type OfficialResults,
  type UserPrediction,
} from './scoring';
import type { Prediction, PredictionBracketEntry, PredictionGroupScore } from '@/lib/types/prediction';
import type { Match, Team } from '@/lib/types/match';

// ── Builders ────────────────────────────────────────────────────────

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    user_id: 'u1',
    locked_at: null,
    champion_code: null,
    runner_up_code: null,
    third_place_code: null,
    final_home_score: null,
    final_away_score: null,
    top_scorer: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function gs(match_id: string, home: number, away: number): PredictionGroupScore {
  return { user_id: 'u1', match_id, home_score: home, away_score: away };
}

function br(round: PredictionBracketEntry['round'], team_code: string): PredictionBracketEntry {
  return { user_id: 'u1', round, team_code };
}

function emptyOfficial(overrides: Partial<OfficialResults> = {}): OfficialResults {
  return {
    groupScores: new Map(),
    advancers: { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set() },
    finalists: new Set(),
    finalScore: null,
    champion: null,
    runnerUp: null,
    thirdPlace: null,
    topScorer: null,
    ...overrides,
  };
}

function emptyUser(overrides: Partial<UserPrediction> = {}): UserPrediction {
  return { prediction: makePrediction(), groupScores: [], bracket: [], ...overrides };
}

// ── normalizeScorer ─────────────────────────────────────────────────

describe('normalizeScorer', () => {
  it('quita acentos, baja a minúsculas y colapsa espacios', () => {
    expect(normalizeScorer('José  MÉNDEZ ')).toBe('jose mendez');
    expect(normalizeScorer('Kylian Mbappé')).toBe('kylian mbappe');
    expect(normalizeScorer('  Lionel   Messi  ')).toBe('lionel messi');
  });
});

// ── Fase de grupos ──────────────────────────────────────────────────

describe('computeScore — grupos', () => {
  it('marcador exacto = 5', () => {
    const user = emptyUser({ groupScores: [gs('m1', 2, 1)] });
    const actual = emptyOfficial({ groupScores: new Map([['m1', { home: 2, away: 1 }]]) });
    const r = computeScore(user, actual);
    expect(r.groupExact).toBe(5);
    expect(r.groupExactCount).toBe(1);
    expect(r.groupOutcome).toBe(0);
    expect(r.total).toBe(5);
  });

  it('solo resultado (gana local) = 2', () => {
    const user = emptyUser({ groupScores: [gs('m1', 3, 0)] });
    const actual = emptyOfficial({ groupScores: new Map([['m1', { home: 1, away: 0 }]]) });
    const r = computeScore(user, actual);
    expect(r.groupExact).toBe(0);
    expect(r.groupOutcome).toBe(2);
    expect(r.groupOutcomeCount).toBe(1);
  });

  it('empate correcto (distinto marcador) = 2', () => {
    const user = emptyUser({ groupScores: [gs('m1', 2, 2)] });
    const actual = emptyOfficial({ groupScores: new Map([['m1', { home: 0, away: 0 }]]) });
    expect(computeScore(user, actual).groupOutcome).toBe(2);
  });

  it('resultado equivocado = 0', () => {
    const user = emptyUser({ groupScores: [gs('m1', 0, 1)] });
    const actual = emptyOfficial({ groupScores: new Map([['m1', { home: 1, away: 0 }]]) });
    expect(computeScore(user, actual).total).toBe(0);
  });

  it('partido sin resultado oficial no puntúa', () => {
    const user = emptyUser({ groupScores: [gs('m1', 2, 1)] });
    const actual = emptyOfficial(); // sin groupScores
    expect(computeScore(user, actual).total).toBe(0);
  });

  it('exacto NO suma además el de resultado (no se duplica)', () => {
    const user = emptyUser({ groupScores: [gs('m1', 2, 1)] });
    const actual = emptyOfficial({ groupScores: new Map([['m1', { home: 2, away: 1 }]]) });
    const r = computeScore(user, actual);
    expect(r.total).toBe(5); // no 7
  });
});

// ── Bracket ─────────────────────────────────────────────────────────

describe('computeScore — bracket', () => {
  it('puntúa por equipo que avanzó, con el valor de cada ronda', () => {
    const user = emptyUser({
      bracket: [
        br('r32', 'AAA'),
        br('r32', 'BBB'), // no avanzó
        br('r16', 'AAA'),
        br('qf', 'AAA'),
        br('sf', 'AAA'),
      ],
    });
    const actual = emptyOfficial({
      advancers: {
        r32: new Set(['AAA']),
        r16: new Set(['AAA']),
        qf: new Set(['AAA']),
        sf: new Set(['AAA']),
      },
    });
    const r = computeScore(user, actual);
    expect(r.r32).toBe(SCORING.bracket.r32); // solo AAA (2)
    expect(r.r16).toBe(SCORING.bracket.r16); // 3
    expect(r.qf).toBe(SCORING.bracket.qf); // 5
    expect(r.sf).toBe(SCORING.bracket.sf); // 8
    expect(r.total).toBe(2 + 3 + 5 + 8);
  });

  it('equipo predicho que no avanzó no suma', () => {
    const user = emptyUser({ bracket: [br('r32', 'XXX')] });
    const actual = emptyOfficial({ advancers: { r32: new Set(['YYY']), r16: new Set(), qf: new Set(), sf: new Set() } });
    expect(computeScore(user, actual).r32).toBe(0);
  });
});

// ── Podio / campeón / final / goleador ──────────────────────────────

describe('computeScore — podio y extras', () => {
  it('finalistas: 12 por cada uno que llega a la final', () => {
    const user = emptyUser({
      prediction: makePrediction({ champion_code: 'AAA', runner_up_code: 'BBB' }),
    });
    const actual = emptyOfficial({ finalists: new Set(['AAA', 'BBB']) });
    expect(computeScore(user, actual).finalists).toBe(24);
  });

  it('finalistas: solo uno acierta = 12', () => {
    const user = emptyUser({
      prediction: makePrediction({ champion_code: 'AAA', runner_up_code: 'ZZZ' }),
    });
    const actual = emptyOfficial({ finalists: new Set(['AAA', 'BBB']) });
    expect(computeScore(user, actual).finalists).toBe(12);
  });

  it('campeón correcto = 30', () => {
    const user = emptyUser({ prediction: makePrediction({ champion_code: 'AAA' }) });
    const actual = emptyOfficial({ champion: 'AAA' });
    expect(computeScore(user, actual).champion).toBe(30);
  });

  it('tercer puesto correcto = 15', () => {
    const user = emptyUser({ prediction: makePrediction({ third_place_code: 'CCC' }) });
    const actual = emptyOfficial({ thirdPlace: 'CCC' });
    expect(computeScore(user, actual).thirdPlace).toBe(15);
  });

  it('marcador exacto final en orden correcto (campeón gana 2-1) = 15', () => {
    // El usuario asigna 2 a su campeón y 1 a su subcampeón.
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 2, final_away_score: 1 }),
    });
    const actual = emptyOfficial({ finalScore: { home: 2, away: 1 } });
    expect(computeScore(user, actual).finalExact).toBe(15);
  });

  it('marcador final independiente del equipo local/visitante oficial', () => {
    // Campeón 2, subcampeón 1; el ganador oficial fue el visitante (1-2).
    // Como se compara ganador/perdedor, el orden del usuario igual acierta.
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 2, final_away_score: 1 }),
    });
    const actual = emptyOfficial({ finalScore: { home: 1, away: 2 } });
    expect(computeScore(user, actual).finalExact).toBe(15);
  });

  it('marcador final en orden invertido NO cuenta (1-2 vs ganador 2-1) = 0', () => {
    // El usuario dijo que su campeón marca 1 y el subcampeón 2: orden errado.
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 1, final_away_score: 2 }),
    });
    const actual = emptyOfficial({ finalScore: { home: 2, away: 1 } });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('marcador final empate exacto a 90 (definido por penales) = 15', () => {
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 1, final_away_score: 1 }),
    });
    const actual = emptyOfficial({ finalScore: { home: 1, away: 1 } });
    expect(computeScore(user, actual).finalExact).toBe(15);
  });

  it('marcador exacto final equivocado = 0', () => {
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 3, final_away_score: 0 }),
    });
    const actual = emptyOfficial({ finalScore: { home: 1, away: 1 } });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('marcador final incompleto (un lado null) = 0', () => {
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 2, final_away_score: null }),
    });
    const actual = emptyOfficial({ finalScore: { home: 2, away: 1 } });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('goleador con match flexible (acentos/mayúsculas) = 15', () => {
    const user = emptyUser({ prediction: makePrediction({ top_scorer: 'kylian mbappe' }) });
    const actual = emptyOfficial({ topScorer: 'Kylian Mbappé' });
    expect(computeScore(user, actual).topScorer).toBe(15);
  });

  it('goleador distinto = 0', () => {
    const user = emptyUser({ prediction: makePrediction({ top_scorer: 'Messi' }) });
    const actual = emptyOfficial({ topScorer: 'Haaland' });
    expect(computeScore(user, actual).topScorer).toBe(0);
  });
});

// ── Casos límite ────────────────────────────────────────────────────

describe('computeScore — casos límite', () => {
  it('pronóstico vacío = 0', () => {
    expect(computeScore(emptyUser(), emptyOfficial()).total).toBe(0);
  });

  it('prediction null no rompe', () => {
    const user: UserPrediction = { prediction: null, groupScores: [], bracket: [] };
    expect(computeScore(user, emptyOfficial()).total).toBe(0);
  });

  it('pronóstico perfecto = 643 (máximo teórico)', () => {
    // 32 equipos para r32, subconjuntos para rondas siguientes
    const teams = Array.from({ length: 32 }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);
    const r16 = teams.slice(0, 16);
    const qf = teams.slice(0, 8);
    const sf = teams.slice(0, 4);

    const bracket: PredictionBracketEntry[] = [
      ...teams.map((t) => br('r32', t)),
      ...r16.map((t) => br('r16', t)),
      ...qf.map((t) => br('qf', t)),
      ...sf.map((t) => br('sf', t)),
    ];

    // 72 marcadores exactos
    const groupScores = Array.from({ length: 72 }, (_, i) => gs(`m${i + 1}`, 2, 1));
    const officialGroups = new Map(
      Array.from({ length: 72 }, (_, i) => [`m${i + 1}`, { home: 2, away: 1 }] as const),
    );

    const user = emptyUser({
      prediction: makePrediction({
        champion_code: sf[0],
        runner_up_code: sf[1],
        third_place_code: sf[2],
        final_home_score: 2,
        final_away_score: 1,
        top_scorer: 'Goleador X',
      }),
      groupScores,
      bracket,
    });

    const actual: OfficialResults = {
      groupScores: officialGroups,
      advancers: {
        r32: new Set(teams),
        r16: new Set(r16),
        qf: new Set(qf),
        sf: new Set(sf),
      },
      finalists: new Set([sf[0], sf[1]]),
      finalScore: { home: 2, away: 1 },
      champion: sf[0],
      runnerUp: sf[1],
      thirdPlace: sf[2],
      topScorer: 'Goleador X',
    };

    const r = computeScore(user, actual);
    expect(r.groupExact).toBe(360);
    expect(r.r32).toBe(64);
    expect(r.r16).toBe(48);
    expect(r.qf).toBe(40);
    expect(r.sf).toBe(32);
    expect(r.finalists).toBe(24);
    expect(r.thirdPlace).toBe(15);
    expect(r.champion).toBe(30);
    expect(r.finalExact).toBe(15);
    expect(r.topScorer).toBe(15);
    expect(r.total).toBe(643);
  });
});

// ── deriveOfficialResults ───────────────────────────────────────────

function team(code: string): Team {
  return { code, name: code, flag: 'xx', group_code: null };
}

function match(overrides: Partial<Match> & Pick<Match, 'id' | 'match_number' | 'stage'>): Match {
  return {
    group_code: null,
    home_team: null,
    away_team: null,
    bracket_source_home: null,
    bracket_source_away: null,
    kicks_off_at: '2026-06-11T19:00:00Z',
    venue: 'X',
    home_score: null,
    away_score: null,
    status: 'scheduled',
    ...overrides,
  } as Match;
}

describe('deriveOfficialResults', () => {
  it('extrae marcadores de grupos finalizados e ignora los no finalizados', () => {
    const matches: Match[] = [
      match({
        id: 'g1',
        match_number: 1,
        stage: 'group',
        status: 'final',
        home_team: team('MEX'),
        away_team: team('RSA'),
        home_score: 2,
        away_score: 0,
      }),
      match({
        id: 'g2',
        match_number: 2,
        stage: 'group',
        status: 'scheduled', // sin jugar
        home_team: team('KOR'),
        away_team: team('CZE'),
      }),
    ];
    const r = deriveOfficialResults(matches);
    expect(r.groupScores.get('g1')).toEqual({ home: 2, away: 0 });
    expect(r.groupScores.has('g2')).toBe(false);
  });

  it('deriva campeón, subcampeón, tercero y clasificados', () => {
    const matches: Match[] = [
      match({
        id: 'r32a',
        match_number: 73,
        stage: 'r32',
        home_team: team('AAA'),
        away_team: team('BBB'),
      }),
      match({
        id: 'thirdm',
        match_number: 103,
        stage: '3rd',
        home_team: team('CCC'),
        away_team: team('DDD'),
        home_score: 2,
        away_score: 1,
        status: 'final',
      }),
      match({
        id: 'finalm',
        match_number: 104,
        stage: 'final',
        home_team: team('AAA'),
        away_team: team('BBB'),
        home_score: 3,
        away_score: 1,
        status: 'final',
      }),
    ];
    const r = deriveOfficialResults(matches, 'Goleador X');
    expect(r.advancers.r32.has('AAA')).toBe(true);
    expect(r.advancers.r32.has('BBB')).toBe(true);
    expect(r.finalists).toEqual(new Set(['AAA', 'BBB']));
    expect(r.finalScore).toEqual({ home: 3, away: 1 });
    expect(r.champion).toBe('AAA');
    expect(r.runnerUp).toBe('BBB');
    expect(r.thirdPlace).toBe('CCC');
    expect(r.topScorer).toBe('Goleador X');
  });
});

// ── buildRanking ────────────────────────────────────────────────────

describe('buildRanking', () => {
  it('agrupa por usuario y ordena por puntaje desc', () => {
    const predictions: Prediction[] = [
      makePrediction({ user_id: 'ana', champion_code: 'BRA' }), // acierta campeón → 30
      makePrediction({ user_id: 'leo', champion_code: 'ARG' }), // no acierta → 0
    ];
    const groupScores: PredictionGroupScore[] = [
      { user_id: 'leo', match_id: 'm1', home_score: 2, away_score: 1 }, // exacto → 5
    ];
    const bracket: PredictionBracketEntry[] = [];
    const official = emptyOfficial({
      champion: 'BRA',
      groupScores: new Map([['m1', { home: 2, away: 1 }]]),
    });

    const ranking = buildRanking(predictions, groupScores, bracket, official);
    expect(ranking).toHaveLength(2);
    expect(ranking[0].userId).toBe('ana'); // 30 pts
    expect(ranking[0].breakdown.total).toBe(30);
    expect(ranking[1].userId).toBe('leo'); // 5 pts
    expect(ranking[1].breakdown.total).toBe(5);
  });

  it('incluye usuarios que solo tienen marcadores o solo bracket', () => {
    const predictions: Prediction[] = [];
    const groupScores: PredictionGroupScore[] = [
      { user_id: 'ana', match_id: 'm1', home_score: 1, away_score: 0 },
    ];
    const bracket: PredictionBracketEntry[] = [{ user_id: 'leo', round: 'r32', team_code: 'BRA' }];
    const official = emptyOfficial({
      groupScores: new Map([['m1', { home: 1, away: 0 }]]),
      advancers: { r32: new Set(['BRA']), r16: new Set(), qf: new Set(), sf: new Set() },
    });

    const ranking = buildRanking(predictions, groupScores, bracket, official);
    expect(ranking).toHaveLength(2);
    const ana = ranking.find((r) => r.userId === 'ana')!;
    const leo = ranking.find((r) => r.userId === 'leo')!;
    expect(ana.breakdown.total).toBe(5); // marcador exacto
    expect(leo.breakdown.total).toBe(2); // 1 equipo en r32
  });

  it('sin resultados oficiales, todos quedan en 0', () => {
    const predictions: Prediction[] = [
      makePrediction({ user_id: 'ana', champion_code: 'BRA' }),
      makePrediction({ user_id: 'leo', champion_code: 'ARG' }),
    ];
    const ranking = buildRanking(predictions, [], [], emptyOfficial());
    expect(ranking.every((r) => r.breakdown.total === 0)).toBe(true);
  });
});
