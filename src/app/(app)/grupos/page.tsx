import { createClient } from '@/lib/supabase/server';
import {
  computeGroupStandings,
  rankGroup,
  type GroupStandingOverride,
} from '@/lib/compute-standings';
import { GroupTable } from '@/components/groups/GroupTable';
import type { Match, Team } from '@/lib/types/match';

export const metadata = { title: 'Fase de grupos' };

export default async function GruposPage() {
  const supabase = await createClient();

  // Para calcular standings necesitamos los equipos con su group_code
  // y los partidos de la fase de grupos.
  const [teamsResult, matchesResult, overridesResult] = await Promise.all([
    supabase
      .from('teams')
      .select('code, name, flag, group_code')
      .not('group_code', 'is', null)
      .order('group_code', { ascending: true }),
    supabase
      .from('matches')
      .select(
        `
        id, match_number, stage, group_code,
        bracket_source_home, bracket_source_away,
        kicks_off_at, venue, home_score, away_score, status,
        home_team:teams!matches_home_team_code_fkey(code, name, flag, group_code),
        away_team:teams!matches_away_team_code_fkey(code, name, flag, group_code)
      `,
      )
      .eq('stage', 'group'),
    // Override manual del admin. Tolerante: si la tabla aún no existe / falla,
    // se degrada al orden automático (no rompe /grupos).
    supabase.from('group_standings').select('team_code, position, third_qualifies'),
  ]);

  if (teamsResult.error || matchesResult.error) {
    console.error(
      '[grupos] error fetching data:',
      teamsResult.error?.message ?? matchesResult.error?.message,
    );
    return (
      <div className="max-w-[880px] mx-auto px-5 py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Fase de grupos</h1>
        <p className="text-muted-foreground text-sm">
          No pudimos cargar las tablas. Intenta de nuevo en unos minutos.
        </p>
      </div>
    );
  }

  const teams = (teamsResult.data ?? []) as Team[];
  const matches = (matchesResult.data ?? []).map((row) => {
    const homeTeam = Array.isArray(row.home_team) ? (row.home_team[0] ?? null) : (row.home_team ?? null);
    const awayTeam = Array.isArray(row.away_team) ? (row.away_team[0] ?? null) : (row.away_team ?? null);
    return { ...row, home_team: homeTeam, away_team: awayTeam };
  }) as unknown as Match[];

  const overrides = (overridesResult.data ?? []) as GroupStandingOverride[];
  const overrideByTeam = new Map(overrides.map((o) => [o.team_code, o]));

  const standingsByGroup = computeGroupStandings(matches, teams);
  const rankedByGroup = new Map(
    Array.from(standingsByGroup, ([code, list]) => [code, rankGroup(list, overrideByTeam)] as const),
  );
  const groupCodes = Array.from(rankedByGroup.keys()).sort();

  return (
    <div className="max-w-[880px] mx-auto px-5 py-9 sm:py-10 flex flex-col gap-7">
      <header>
        <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight text-foreground">
          Fase de grupos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {groupCodes.length} grupos · {teams.length} equipos
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {groupCodes.map((code) => (
          <GroupTable
            key={code}
            groupCode={code}
            standings={rankedByGroup.get(code) ?? []}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Las dos primeras posiciones clasifican directamente a la siguiente ronda.
        Los 8 mejores terceros también avanzan.
      </p>
    </div>
  );
}
