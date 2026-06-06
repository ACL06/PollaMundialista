import { CheckCircle2, Lock } from 'lucide-react';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { formatMatchDateKey, formatMatchDateLong } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { BracketFunnel } from './BracketFunnel';
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
  /**
   * Si se pasa, es el pronóstico de OTRO usuario (vista Comunidad) y el
   * encabezado dice "Pronóstico de {ownerName}". Si se omite, es el propio.
   */
  ownerName?: string;
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
  ownerName,
}: PredictionViewProps) {
  const isOwn = !ownerName;

  // Marcadores: match_id → score
  const scoreByMatch = new Map(groupScores.map((s) => [s.match_id, s]));
  const scoredCount = groupScores.length;

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-3">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          {isOwn ? 'Mi pronóstico' : `Pronóstico de ${ownerName}`}
        </h1>
        {isSubmitted ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {isOwn ? 'Enviado · definitivo' : 'Enviado'}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
            <Lock className="h-4 w-4" />
            Plazo cerrado
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {!isOwn
            ? 'Visible para todos porque el plazo de pronósticos ya cerró.'
            : isLocked
              ? 'El torneo ya comenzó. Este es tu pronóstico final, no se puede modificar.'
              : 'Ya enviaste tu pronóstico. Quedó registrado como definitivo.'}
        </p>
      </header>

      {/* Camino al título: embudo 32 → 16 → 8 → 4 → finalistas → campeón */}
      <BracketFunnel prediction={prediction} bracket={bracket} teams={teams} />

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
