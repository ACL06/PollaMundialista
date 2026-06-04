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
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
  PredictionKnockoutScore,
} from '@/lib/types/prediction';
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
    knockoutScores: new Map(),
    advancers: { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set() },
    finalists: new Set(),
    finalScore: null,
    finalHomeCode: null,
    finalAwayCode: null,
    champion: null,
    runnerUp: null,
    thirdPlace: null,
    topScorer: null,
    ...overrides,
  };
}

function emptyUser(overrides: Partial<UserPrediction> = {}): UserPrediction {
  return {
    prediction: makePrediction(),
    groupScores: [],
    bracket: [],
    knockoutScores: [],
    ...overrides,
  };
}

/** Builder de un marcador de eliminatoria pronosticado. */
function ks(match_id: string, home: number, away: number): PredictionKnockoutScore {
  return { user_id: 'u1', match_id, home_score: home, away_score: away };
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

  it('solo resultado (gana visitante) = 2', () => {
    const user = emptyUser({ groupScores: [gs('m1', 0, 2)] });
    const actual = emptyOfficial({ groupScores: new Map([['m1', { home: 1, away: 3 }]]) });
    const r = computeScore(user, actual);
    expect(r.groupExact).toBe(0);
    expect(r.groupOutcome).toBe(2);
    expect(r.groupOutcomeCount).toBe(1);
  });

  it('varios partidos: suma exactos y resultados por separado', () => {
    const user = emptyUser({
      groupScores: [gs('m1', 2, 1), gs('m2', 3, 0), gs('m3', 0, 0)],
    });
    const actual = emptyOfficial({
      groupScores: new Map([
        ['m1', { home: 2, away: 1 }], // exacto → 5
        ['m2', { home: 1, away: 0 }], // solo resultado → 2
        ['m3', { home: 1, away: 2 }], // equivocado → 0
      ]),
    });
    const r = computeScore(user, actual);
    expect(r.groupExact).toBe(5);
    expect(r.groupExactCount).toBe(1);
    expect(r.groupOutcome).toBe(2);
    expect(r.groupOutcomeCount).toBe(1);
    expect(r.total).toBe(7);
  });
});

// ── Marcadores de eliminatoria ──────────────────────────────────────

describe('computeScore — marcadores de eliminatoria', () => {
  it('marcador exacto = 5', () => {
    const user = emptyUser({ knockoutScores: [ks('r32a', 2, 1)] });
    const actual = emptyOfficial({ knockoutScores: new Map([['r32a', { home: 2, away: 1 }]]) });
    const r = computeScore(user, actual);
    expect(r.knockoutExact).toBe(5);
    expect(r.knockoutExactCount).toBe(1);
    expect(r.knockoutOutcome).toBe(0);
    expect(r.total).toBe(5);
  });

  it('solo resultado (a los 90 min) = 2', () => {
    const user = emptyUser({ knockoutScores: [ks('r32a', 3, 0)] });
    const actual = emptyOfficial({ knockoutScores: new Map([['r32a', { home: 1, away: 0 }]]) });
    const r = computeScore(user, actual);
    expect(r.knockoutExact).toBe(0);
    expect(r.knockoutOutcome).toBe(2);
    expect(r.knockoutOutcomeCount).toBe(1);
  });

  it('empate a los 90 min (definido por penales) cuenta como resultado = 2', () => {
    const user = emptyUser({ knockoutScores: [ks('r16a', 1, 1)] });
    const actual = emptyOfficial({ knockoutScores: new Map([['r16a', { home: 0, away: 0 }]]) });
    expect(computeScore(user, actual).knockoutOutcome).toBe(2);
  });

  it('resultado equivocado = 0', () => {
    const user = emptyUser({ knockoutScores: [ks('qfa', 0, 1)] });
    const actual = emptyOfficial({ knockoutScores: new Map([['qfa', { home: 1, away: 0 }]]) });
    expect(computeScore(user, actual).total).toBe(0);
  });

  it('partido sin resultado oficial no puntúa', () => {
    const user = emptyUser({ knockoutScores: [ks('sfa', 2, 1)] });
    const actual = emptyOfficial();
    expect(computeScore(user, actual).total).toBe(0);
  });

  it('exacto NO suma además el de resultado (no se duplica)', () => {
    const user = emptyUser({ knockoutScores: [ks('r32a', 2, 1)] });
    const actual = emptyOfficial({ knockoutScores: new Map([['r32a', { home: 2, away: 1 }]]) });
    expect(computeScore(user, actual).total).toBe(5);
  });

  it('grupos y eliminatoria suman juntos', () => {
    const user = emptyUser({
      groupScores: [gs('g1', 1, 0)],
      knockoutScores: [ks('r32a', 2, 1)],
    });
    const actual = emptyOfficial({
      groupScores: new Map([['g1', { home: 1, away: 0 }]]),
      knockoutScores: new Map([['r32a', { home: 2, away: 1 }]]),
    });
    expect(computeScore(user, actual).total).toBe(10); // 5 + 5
  });

  it('solo resultado (gana visitante) = 2', () => {
    const user = emptyUser({ knockoutScores: [ks('r32a', 0, 2)] });
    const actual = emptyOfficial({ knockoutScores: new Map([['r32a', { home: 1, away: 4 }]]) });
    const r = computeScore(user, actual);
    expect(r.knockoutExact).toBe(0);
    expect(r.knockoutOutcome).toBe(2);
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

  it('independencia por ronda: acertar r32 pero no r16 da solo el r32', () => {
    // AAA llegó a R32 pero NO a Octavos; el usuario lo puso en ambas rondas.
    const user = emptyUser({ bracket: [br('r32', 'AAA'), br('r16', 'AAA')] });
    const actual = emptyOfficial({
      advancers: { r32: new Set(['AAA']), r16: new Set(['BBB']), qf: new Set(), sf: new Set() },
    });
    const r = computeScore(user, actual);
    expect(r.r32).toBe(SCORING.bracket.r32); // 2
    expect(r.r16).toBe(0);
    expect(r.total).toBe(SCORING.bracket.r32);
  });

  it('cuenta cada equipo acertado de la ronda (2 en r32 = 2×2)', () => {
    const user = emptyUser({ bracket: [br('r32', 'AAA'), br('r32', 'BBB'), br('r32', 'XXX')] });
    const actual = emptyOfficial({
      advancers: { r32: new Set(['AAA', 'BBB']), r16: new Set(), qf: new Set(), sf: new Set() },
    });
    expect(computeScore(user, actual).r32).toBe(2 * SCORING.bracket.r32); // AAA + BBB, no XXX
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

  it('campeón equivocado = 0', () => {
    const user = emptyUser({ prediction: makePrediction({ champion_code: 'AAA' }) });
    const actual = emptyOfficial({ champion: 'ZZZ' });
    expect(computeScore(user, actual).champion).toBe(0);
  });

  it('campeón sin resultado oficial (final no jugada) = 0', () => {
    const user = emptyUser({ prediction: makePrediction({ champion_code: 'AAA' }) });
    const actual = emptyOfficial({ champion: null });
    expect(computeScore(user, actual).champion).toBe(0);
  });

  it('campeón por penales: acertar campeón suma 30 aunque el 90 fuera empate', () => {
    // Final 1-1 a los 90', definida por penales a favor de AAA (el admin lo
    // declaró → official.champion = AAA). El usuario predijo campeón AAA y el
    // empate 1-1: gana los 30 del campeón Y los 15 del marcador (empate exacto).
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 1,
        final_away_score: 1,
      }),
    });
    const actual = emptyOfficial({
      finalists: new Set(['AAA', 'BBB']),
      finalScore: { home: 1, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
      champion: 'AAA',
      runnerUp: 'BBB',
    });
    const r = computeScore(user, actual);
    expect(r.champion).toBe(30);
    expect(r.finalExact).toBe(15);
    expect(r.finalists).toBe(24);
  });

  it('tercer lugar correcto = 15', () => {
    const user = emptyUser({ prediction: makePrediction({ third_place_code: 'CCC' }) });
    const actual = emptyOfficial({ thirdPlace: 'CCC' });
    expect(computeScore(user, actual).thirdPlace).toBe(15);
  });

  it('tercer lugar equivocado = 0', () => {
    const user = emptyUser({ prediction: makePrediction({ third_place_code: 'CCC' }) });
    const actual = emptyOfficial({ thirdPlace: 'DDD' });
    expect(computeScore(user, actual).thirdPlace).toBe(0);
  });

  it('marcador final estricto, en orden y con finalistas correctos = 15', () => {
    // Tu campeón AAA (local en la final) marca 2; tu subcampeón BBB marca 1.
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 2,
        final_away_score: 1,
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 2, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
    expect(computeScore(user, actual).finalExact).toBe(15);
  });

  it('marcador final por equipo, sin importar local/visitante oficial = 15', () => {
    // Tu campeón AAA fue visitante (away=2) y tu subcampeón BBB local (home=1):
    // se compara por equipo, así que igual acierta.
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 2, // goles de tu campeón
        final_away_score: 1, // goles de tu subcampeón
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 1, away: 2 },
      finalHomeCode: 'BBB',
      finalAwayCode: 'AAA',
    });
    expect(computeScore(user, actual).finalExact).toBe(15);
  });

  it('marcador final en orden invertido NO cuenta = 0', () => {
    // Le pones 1 a tu campeón y 2 a tu subcampeón, pero AAA marcó 2 y BBB 1.
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 1,
        final_away_score: 2,
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 2, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('marcador final con finalista equivocado NO cuenta aunque la pizarra coincida = 0', () => {
    // El 2-1 coincide, pero tu subcampeón ZZZ no jugó la final.
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'ZZZ',
        final_home_score: 2,
        final_away_score: 1,
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 2, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('marcador final empate exacto a 90 entre tus finalistas = 15', () => {
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 1,
        final_away_score: 1,
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 1, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
    expect(computeScore(user, actual).finalExact).toBe(15);
  });

  it('marcador exacto final equivocado = 0', () => {
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 3,
        final_away_score: 0,
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 1, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('marcador final sin elegir finalistas NO cuenta = 0', () => {
    // Aunque la pizarra coincida, sin campeón/subcampeón no hay a quién asignar.
    const user = emptyUser({
      prediction: makePrediction({ final_home_score: 2, final_away_score: 1 }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 2, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
    expect(computeScore(user, actual).finalExact).toBe(0);
  });

  it('marcador final incompleto (un lado null) = 0', () => {
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 2,
        final_away_score: null,
      }),
    });
    const actual = emptyOfficial({
      finalScore: { home: 2, away: 1 },
      finalHomeCode: 'AAA',
      finalAwayCode: 'BBB',
    });
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

  it('goleador predicho pero sin goleador oficial cargado = 0', () => {
    const user = emptyUser({ prediction: makePrediction({ top_scorer: 'Messi' }) });
    const actual = emptyOfficial({ topScorer: null });
    expect(computeScore(user, actual).topScorer).toBe(0);
  });

  it('goleador vacío / solo espacios = 0 (no rompe)', () => {
    const user = emptyUser({ prediction: makePrediction({ top_scorer: '   ' }) });
    const actual = emptyOfficial({ topScorer: 'Haaland' });
    expect(computeScore(user, actual).topScorer).toBe(0);
  });

  it('finalistas correctos pero final aún no jugada (finalScore null) → marcador = 0', () => {
    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA',
        runner_up_code: 'BBB',
        final_home_score: 2,
        final_away_score: 1,
      }),
    });
    const actual = emptyOfficial({
      finalists: new Set(['AAA', 'BBB']),
      finalScore: null,
    });
    const r = computeScore(user, actual);
    expect(r.finalExact).toBe(0);
    expect(r.finalists).toBe(24); // los finalistas sí, el marcador no
  });
});

// ── Casos límite ────────────────────────────────────────────────────

describe('computeScore — casos límite', () => {
  it('pronóstico vacío = 0', () => {
    expect(computeScore(emptyUser(), emptyOfficial()).total).toBe(0);
  });

  it('prediction null no rompe', () => {
    const user: UserPrediction = { prediction: null, groupScores: [], bracket: [], knockoutScores: [] };
    expect(computeScore(user, emptyOfficial()).total).toBe(0);
  });

  it('pronóstico perfecto = 798 (máximo teórico)', () => {
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

    // 72 marcadores exactos de grupos
    const groupScores = Array.from({ length: 72 }, (_, i) => gs(`m${i + 1}`, 2, 1));
    const officialGroups = new Map(
      Array.from({ length: 72 }, (_, i) => [`m${i + 1}`, { home: 2, away: 1 }] as const),
    );

    // 31 marcadores exactos de eliminatoria (16 + 8 + 4 + 2 + 1)
    const knockoutScores = Array.from({ length: 31 }, (_, i) => ks(`k${i + 1}`, 2, 1));
    const officialKnockout = new Map(
      Array.from({ length: 31 }, (_, i) => [`k${i + 1}`, { home: 2, away: 1 }] as const),
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
      knockoutScores,
    });

    const actual: OfficialResults = {
      groupScores: officialGroups,
      knockoutScores: officialKnockout,
      advancers: {
        r32: new Set(teams),
        r16: new Set(r16),
        qf: new Set(qf),
        sf: new Set(sf),
      },
      finalists: new Set([sf[0], sf[1]]),
      finalScore: { home: 2, away: 1 },
      finalHomeCode: sf[0],
      finalAwayCode: sf[1],
      champion: sf[0],
      runnerUp: sf[1],
      thirdPlace: sf[2],
      topScorer: 'Goleador X',
    };

    const r = computeScore(user, actual);
    expect(r.groupExact).toBe(360);
    expect(r.knockoutExact).toBe(155);
    expect(r.knockoutExactCount).toBe(31);
    expect(r.r32).toBe(64);
    expect(r.r16).toBe(48);
    expect(r.qf).toBe(40);
    expect(r.sf).toBe(32);
    expect(r.finalists).toBe(24);
    expect(r.thirdPlace).toBe(15);
    expect(r.champion).toBe(30);
    expect(r.finalExact).toBe(15);
    expect(r.topScorer).toBe(15);
    expect(r.total).toBe(798);
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
    winner_code: null,
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
    expect(r.finalHomeCode).toBe('AAA');
    expect(r.finalAwayCode).toBe('BBB');
    expect(r.champion).toBe('AAA');
    expect(r.runnerUp).toBe('BBB');
    expect(r.thirdPlace).toBe('CCC');
    expect(r.topScorer).toBe('Goleador X');
    // El 3er lugar (finalizado) entra a knockoutScores; el r32 sin marcador y
    // la final (que tiene su bonus aparte) no.
    expect(r.knockoutScores.get('thirdm')).toEqual({ home: 2, away: 1 });
    expect(r.knockoutScores.has('r32a')).toBe(false);
    expect(r.knockoutScores.has('finalm')).toBe(false);
  });

  it('final empatada a 90 con winner_code declara campeón y subcampeón (Hallazgo 1)', () => {
    const matches: Match[] = [
      match({
        id: 'finalm',
        match_number: 104,
        stage: 'final',
        home_team: team('AAA'),
        away_team: team('BBB'),
        home_score: 1,
        away_score: 1,
        winner_code: 'AAA', // definido por penales
        status: 'final',
      }),
    ];
    const r = deriveOfficialResults(matches);
    expect(r.champion).toBe('AAA');
    expect(r.runnerUp).toBe('BBB');
    expect(r.finalScore).toEqual({ home: 1, away: 1 });
  });

  it('3er lugar por penales: winner_code define el tercero aunque empate a 90', () => {
    const matches: Match[] = [
      match({
        id: 'thirdm',
        match_number: 103,
        stage: '3rd',
        home_team: team('CCC'),
        away_team: team('DDD'),
        home_score: 0,
        away_score: 0,
        winner_code: 'DDD',
        status: 'final',
      }),
    ];
    expect(deriveOfficialResults(matches).thirdPlace).toBe('DDD');
  });

  it('final en vivo (status live) no deriva campeón ni marcador (Hallazgo 2)', () => {
    const matches: Match[] = [
      match({
        id: 'finalm',
        match_number: 104,
        stage: 'final',
        home_team: team('AAA'),
        away_team: team('BBB'),
        home_score: 2,
        away_score: 1,
        status: 'live',
      }),
    ];
    const r = deriveOfficialResults(matches);
    expect(r.champion).toBeNull();
    expect(r.finalScore).toBeNull();
    // Los finalistas sí: ya están en la final aunque no haya terminado.
    expect(r.finalists).toEqual(new Set(['AAA', 'BBB']));
  });

  it('r32 finalizado con marcador entra a knockoutScores y a clasificados r32', () => {
    const matches: Match[] = [
      match({
        id: 'k73',
        match_number: 73,
        stage: 'r32',
        home_team: team('AAA'),
        away_team: team('CCC'),
        home_score: 1,
        away_score: 0,
        status: 'final',
      }),
    ];
    const r = deriveOfficialResults(matches);
    expect(r.knockoutScores.get('k73')).toEqual({ home: 1, away: 0 });
    expect(r.advancers.r32).toEqual(new Set(['AAA', 'CCC']));
  });

  it('eliminatoria en vivo NO entra a knockoutScores pero sí a clasificados', () => {
    const matches: Match[] = [
      match({
        id: 'k73',
        match_number: 73,
        stage: 'r32',
        home_team: team('AAA'),
        away_team: team('CCC'),
        home_score: 1,
        away_score: 0,
        status: 'live',
      }),
    ];
    const r = deriveOfficialResults(matches);
    expect(r.knockoutScores.has('k73')).toBe(false);
    expect(r.advancers.r32).toEqual(new Set(['AAA', 'CCC']));
  });

  it('3er lugar en vivo no define tercero (status gate)', () => {
    const matches: Match[] = [
      match({
        id: 'thirdm',
        match_number: 103,
        stage: '3rd',
        home_team: team('CCC'),
        away_team: team('DDD'),
        home_score: 2,
        away_score: 1,
        status: 'live',
      }),
    ];
    const r = deriveOfficialResults(matches);
    expect(r.thirdPlace).toBeNull();
    expect(r.knockoutScores.has('thirdm')).toBe(false);
  });
});

// ── Integración: derive → score (pipeline real) ─────────────────────
// El test "perfecto" usa OfficialResults armado a mano; acá derivamos los
// resultados desde `matches` (como en producción) y luego puntuamos, para
// confirmar que cada regla se enciende de punta a punta.
describe('integración deriveOfficialResults → computeScore', () => {
  it('puntúa cada regla desde matches reales (grupos, eliminatoria, bracket, podio, final, goleador)', () => {
    const matches: Match[] = [
      // Grupo finalizado AAA 2-1 BBB
      match({
        id: 'g1',
        match_number: 1,
        stage: 'group',
        status: 'final',
        home_team: team('AAA'),
        away_team: team('BBB'),
        home_score: 2,
        away_score: 1,
      }),
      // R32 finalizado AAA 1-0 CCC → clasificados {AAA, CCC} + marcador
      match({
        id: 'k73',
        match_number: 73,
        stage: 'r32',
        status: 'final',
        home_team: team('AAA'),
        away_team: team('CCC'),
        home_score: 1,
        away_score: 0,
      }),
      // Tercer lugar EEE 2-0 FFF → tercero EEE + marcador de eliminatoria
      match({
        id: 't',
        match_number: 103,
        stage: '3rd',
        status: 'final',
        home_team: team('EEE'),
        away_team: team('FFF'),
        home_score: 2,
        away_score: 0,
      }),
      // Final AAA 3-1 DDD → finalistas {AAA, DDD}, campeón AAA, marcador 3-1
      match({
        id: 'f',
        match_number: 104,
        stage: 'final',
        status: 'final',
        home_team: team('AAA'),
        away_team: team('DDD'),
        home_score: 3,
        away_score: 1,
      }),
    ];
    const official = deriveOfficialResults(matches, 'Goleador X');

    const user = emptyUser({
      prediction: makePrediction({
        champion_code: 'AAA', // 30
        runner_up_code: 'DDD', // finalista
        third_place_code: 'EEE', // 15
        final_home_score: 3, // goles de mi campeón AAA
        final_away_score: 1, // goles de mi subcampeón DDD
        top_scorer: 'goleador x', // 15 (match flexible)
      }),
      groupScores: [gs('g1', 2, 1)], // exacto → 5
      knockoutScores: [
        ks('k73', 1, 0), // exacto → 5
        ks('t', 1, 0), // solo resultado (real 2-0, ambos gana local) → 2
      ],
      bracket: [br('r32', 'AAA'), br('r32', 'ZZZ')], // AAA clasificó (2), ZZZ no (0)
    });

    const r = computeScore(user, official);
    expect(r.groupExact).toBe(5);
    expect(r.knockoutExact).toBe(5);
    expect(r.knockoutOutcome).toBe(2);
    expect(r.r32).toBe(SCORING.bracket.r32); // 2
    expect(r.finalists).toBe(24); // AAA + DDD llegaron a la final
    expect(r.thirdPlace).toBe(15); // EEE
    expect(r.champion).toBe(30); // AAA
    expect(r.finalExact).toBe(15); // 3-1 por equipo
    expect(r.topScorer).toBe(15);
    expect(r.total).toBe(5 + 5 + 2 + 2 + 24 + 15 + 30 + 15 + 15); // 113
  });

  it('3er lugar definido por penales: marcador (resultado) y tercero (winner_code) desde el mismo partido', () => {
    // 3er lugar 1-1 a 90', ganó FFF por penales (winner_code). El usuario
    // predijo el empate 1-1 (marcador exacto → 5) y a FFF como tercero (→ 15).
    const matches: Match[] = [
      match({
        id: 't',
        match_number: 103,
        stage: '3rd',
        status: 'final',
        home_team: team('EEE'),
        away_team: team('FFF'),
        home_score: 1,
        away_score: 1,
        winner_code: 'FFF',
      }),
    ];
    const official = deriveOfficialResults(matches);
    expect(official.thirdPlace).toBe('FFF');

    const user = emptyUser({
      prediction: makePrediction({ third_place_code: 'FFF' }),
      knockoutScores: [ks('t', 1, 1)],
    });
    const r = computeScore(user, official);
    expect(r.knockoutExact).toBe(5); // empate 1-1 exacto
    expect(r.thirdPlace).toBe(15); // tercero correcto (por penales)
    expect(r.total).toBe(20);
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

    const ranking = buildRanking(predictions, groupScores, bracket, [], official);
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

    const ranking = buildRanking(predictions, groupScores, bracket, [], official);
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
    const ranking = buildRanking(predictions, [], [], [], emptyOfficial());
    expect(ranking.every((r) => r.breakdown.total === 0)).toBe(true);
  });

  it('suma los marcadores de eliminatoria al ranking', () => {
    const predictions: Prediction[] = [makePrediction({ user_id: 'ana' })];
    const knockoutScores: PredictionKnockoutScore[] = [
      { user_id: 'ana', match_id: 'r32a', home_score: 2, away_score: 1 },
    ];
    const official = emptyOfficial({
      knockoutScores: new Map([['r32a', { home: 2, away: 1 }]]),
    });
    const ranking = buildRanking(predictions, [], [], knockoutScores, official);
    expect(ranking[0].breakdown.knockoutExact).toBe(5);
    expect(ranking[0].breakdown.total).toBe(5);
  });
});
