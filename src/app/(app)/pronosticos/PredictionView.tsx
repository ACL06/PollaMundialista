import { CheckCircle2, Crown, Lock, Medal, Trophy } from 'lucide-react';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { formatMatchDateKey, formatMatchDateLong } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import {
  BRACKET_ROUNDS,
  BRACKET_ROUND_LABEL,
  BRACKET_ROUND_SIZE,
  type PredictionBracketRound,
} from '@/lib/types/prediction';
import type { Match, Team } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
} from '@/lib/types/prediction';

interface PredictionViewProps {
  prediction: Prediction | null;
  groupScores: PredictionGroupScore[];
  bracket: PredictionBracketEntry[];
  groupMatches: Match[];
  teams: Team[];
  /** El usuario envió su pronóstico (locked_at != null). */
  isSubmitted: boolean;
  /** El plazo global ya cerró (kickoff del match #1). */
  isLocked: boolean;
}

/**
 * Vista de SOLO LECTURA del pronóstico. Se muestra cuando el usuario ya
 * envió (one-shot) o cuando el plazo global cerró. Presenta el
 * pronóstico completo de forma escaneable, sin inputs.
 */
export function PredictionView({
  prediction,
  groupScores,
  bracket,
  groupMatches,
  teams,
  isSubmitted,
  isLocked,
}: PredictionViewProps) {
  const teamsByCode = new Map(teams.map((t) => [t.code, t]));

  // Marcadores: match_id → score
  const scoreByMatch = new Map(groupScores.map((s) => [s.match_id, s]));
  const scoredCount = groupScores.length;

  // Bracket: round → team_codes[]
  const bracketByRound = new Map<PredictionBracketRound, string[]>();
  for (const round of BRACKET_ROUNDS) bracketByRound.set(round, []);
  for (const e of bracket) bracketByRound.get(e.round)?.push(e.team_code);

  // Marcadores agrupados por día (groupMatches viene ordenado por kickoff)
  const days: Array<{ key: string; label: string; matches: Match[] }> = [];
  const dayIndex = new Map<string, number>();
  for (const m of groupMatches) {
    const date = new Date(m.kicks_off_at);
    const key = formatMatchDateKey(date);
    if (!dayIndex.has(key)) {
      dayIndex.set(key, days.length);
      days.push({ key, label: formatMatchDateLong(date), matches: [] });
    }
    days[dayIndex.get(key)!].matches.push(m);
  }

  const podium: Array<{
    label: string;
    Icon: typeof Crown;
    iconClass: string;
    code: string | null;
  }> = [
    { label: 'Campeón', Icon: Crown, iconClass: 'text-amber-500', code: prediction?.champion_code ?? null },
    { label: 'Subcampeón', Icon: Trophy, iconClass: 'text-muted-foreground', code: prediction?.runner_up_code ?? null },
    { label: 'Tercer puesto', Icon: Medal, iconClass: 'text-amber-700', code: prediction?.third_place_code ?? null },
  ];

  const finalScore =
    prediction?.final_home_score != null && prediction?.final_away_score != null
      ? `${prediction.final_home_score} – ${prediction.final_away_score}`
      : '—';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-3">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Mi pronóstico
        </h1>
        {isSubmitted ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Enviado · definitivo
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
            <Lock className="h-4 w-4" />
            Plazo cerrado
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {isLocked
            ? 'El torneo ya comenzó. Este es tu pronóstico final, no se puede modificar.'
            : 'Ya enviaste tu pronóstico. Quedó registrado como definitivo.'}
        </p>
      </header>

      {/* Podio + extras */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Campeón y podio
        </h2>
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {podium.map(({ label, Icon, iconClass, code }) => {
            const team = code ? teamsByCode.get(code) : null;
            return (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-3 bg-surface">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className={cn('h-4 w-4', iconClass)} />
                  {label}
                </span>
                {team ? (
                  <TeamLabel team={team} align="right" />
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface">
            <span className="text-sm font-medium text-foreground">Marcador final (bonus)</span>
            <span className="text-sm font-mono font-bold tabular-nums text-foreground">
              {finalScore}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface">
            <span className="text-sm font-medium text-foreground">Goleador</span>
            <span className="text-sm text-foreground">
              {prediction?.top_scorer?.trim() || '—'}
            </span>
          </div>
        </div>
      </section>

      {/* Bracket */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Clasificados por ronda
        </h2>
        <div className="space-y-4">
          {BRACKET_ROUNDS.map((round) => {
            const codes = bracketByRound.get(round) ?? [];
            return (
              <div key={round} className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  {BRACKET_ROUND_LABEL[round]}
                  <span className="text-muted-foreground tabular-nums normal-case font-normal">
                    {codes.length}/{BRACKET_ROUND_SIZE[round]}
                  </span>
                </h3>
                {codes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin selección.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {codes
                      .map((c) => teamsByCode.get(c))
                      .filter((t): t is Team => !!t)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((team) => (
                        <span
                          key={team.code}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-surface text-[13px]"
                        >
                          <span
                            className={cn(
                              `fi fi-${team.flag} rounded-sm flex-shrink-0`,
                              'shadow-[0_0_0_1px_hsl(var(--border))]',
                            )}
                            style={{ width: 20, height: 15 }}
                            aria-hidden="true"
                          />
                          <span className="text-foreground">{team.name}</span>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Marcadores de grupos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Marcadores de fase de grupos
          <span className="ml-2 font-normal tabular-nums text-foreground">
            {scoredCount}/{groupMatches.length}
          </span>
        </h2>
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <div key={day.key} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day.label}
              </h3>
              <div className="flex flex-col gap-1.5">
                {day.matches.map((match) => {
                  const score = scoreByMatch.get(match.id);
                  return (
                    <div
                      key={match.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center px-3 py-2 rounded-md border border-border bg-surface"
                    >
                      {match.home_team ? (
                        <TeamLabel team={match.home_team} align="right" />
                      ) : (
                        <span className="text-sm text-muted-foreground text-right">—</span>
                      )}
                      <span
                        className={cn(
                          'font-mono font-bold text-[15px] tabular-nums px-2',
                          score ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {score ? `${score.home_score} – ${score.away_score}` : '–'}
                      </span>
                      {match.away_team ? (
                        <TeamLabel team={match.away_team} align="left" />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
