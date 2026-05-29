import { TeamLabel } from './TeamLabel';
import { BracketSlot } from './BracketSlot';
import { ScoreBlock } from './ScoreBlock';
import { MatchStatusBadge } from './MatchStatusBadge';
import { formatMatchTime } from '@/lib/format-date';
import type { Match, MatchStage } from '@/lib/types/match';

const STAGE_LABEL: Record<MatchStage, string> = {
  group: 'Grupos',
  r32: '32avos', // "Treintaidosavos" no cabe en el chip del footer en mobile
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinal',
  '3rd': '3er puesto',
  final: 'Final',
};

export function MatchCard({ match }: { match: Match }) {
  const kicksOffAt = new Date(match.kicks_off_at);
  const hasScore = match.status === 'live' || match.status === 'final';

  return (
    <article className="border border-border bg-surface rounded-lg px-[18px] py-[14px] grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-y-2 sm:gap-x-[18px] font-sans">
      {/* Columna izquierda: hora + status */}
      <div className="flex flex-row sm:flex-col gap-3 sm:gap-1.5 items-center sm:items-start justify-between sm:justify-start">
        <span className="text-[18px] font-semibold text-foreground leading-none">
          {formatMatchTime(kicksOffAt)}
        </span>
        <MatchStatusBadge status={match.status} />
      </div>

      {/* Columna derecha: equipos + score/vs */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {match.home_team ? (
          <TeamLabel team={match.home_team} align="right" />
        ) : (
          <BracketSlot source={match.bracket_source_home} align="right" />
        )}
        {hasScore ? (
          <ScoreBlock home={match.home_score ?? 0} away={match.away_score ?? 0} />
        ) : (
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            vs
          </span>
        )}
        {match.away_team ? (
          <TeamLabel team={match.away_team} align="left" />
        ) : (
          <BracketSlot source={match.bracket_source_away} align="left" />
        )}
      </div>

      {/* Footer: venue + grupo o fase */}
      <div className="col-span-full flex items-center justify-between gap-3 pt-1.5 border-t border-dashed border-border">
        <span className="text-[12px] text-muted-foreground truncate">{match.venue}</span>
        {match.group_code ? (
          <span className="text-[12px] text-muted-foreground whitespace-nowrap">
            Grupo {match.group_code}
          </span>
        ) : match.stage !== 'group' ? (
          <span className="text-[12px] text-muted-foreground whitespace-nowrap">
            {STAGE_LABEL[match.stage]}
          </span>
        ) : null}
      </div>
    </article>
  );
}
