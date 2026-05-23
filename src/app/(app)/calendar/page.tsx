import { createClient } from '@/lib/supabase/server';
import { CalendarList } from './CalendarList';
import type { Match } from '@/lib/types/match';

export const metadata = { title: 'Calendario' };

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('matches')
    .select(
      `
      id, match_number, stage, group_code,
      kicks_off_at, venue, home_score, away_score, status,
      home_team:teams!matches_home_team_code_fkey(code, name, flag, group_code),
      away_team:teams!matches_away_team_code_fkey(code, name, flag, group_code)
    `,
    )
    .order('kicks_off_at', { ascending: true });

  if (error) {
    console.error('[calendar] error fetching matches:', error.message);
    return (
      <div className="max-w-[880px] mx-auto px-5 py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Calendario</h1>
        <p className="text-muted-foreground text-sm">
          No pudimos cargar los partidos. Intenta de nuevo en unos minutos.
        </p>
      </div>
    );
  }

  // Supabase devuelve home_team/away_team como object[] cuando el join es 1:M.
  // Acá es 1:1 (cada partido tiene un home y un away), pero el tipo generado
  // puede ser array — normalizamos para que coincida con nuestro tipo Match.
  const matches = (rows ?? []).map((row) => {
    const homeTeam = Array.isArray(row.home_team) ? row.home_team[0] : row.home_team;
    const awayTeam = Array.isArray(row.away_team) ? row.away_team[0] : row.away_team;
    return {
      ...row,
      home_team: homeTeam,
      away_team: awayTeam,
    };
  }) as unknown as Match[];

  return <CalendarList matches={matches} />;
}
