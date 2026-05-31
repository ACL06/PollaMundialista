import { TeamLabel } from './TeamLabel';
import { BracketSlot } from './BracketSlot';
import { ScoreBlock } from './ScoreBlock';
import { MatchStatusBadge } from './MatchStatusBadge';
import { formatMatchTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Match, MatchStage } from '@/lib/types/match';

const STAGE_LABEL: Record<MatchStage, string> = {
  group: 'Grupos',
  r32: 'Eliminatorias de 32',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  '3rd': 'Tercer lugar',
  final: 'Final',
};

export function MatchCard({ match }: { match: Match }) {
  const kicksOffAt = new Date(match.kicks_off_at);
  const hasScore = match.status === 'live' || match.status === 'final';

  return (
    <article
      className={cn(
        // `minmax(0,1fr)` en la 2da columna evita que el contenido largo de un
        // BracketSlot ("Ganador Octavos de Final") infle la columna a su
        // tamaño intrínseco y rompa el ancho del card.
        'border rounded-lg px-[18px] py-[14px] grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)] gap-y-2 sm:gap-x-[18px] font-sans transition-colors',
        // Color según estado del partido:
        // - scheduled (default): borde y fondo neutros
        // - live: borde secondary (rojo) + tinte rojo sutil para que destaque
        // - final: fondo desaturado y opacity baja, "ya quedó atrás"
        match.status === 'scheduled' && 'border-border bg-surface',
        match.status === 'live' && 'border-secondary bg-secondary/5 shadow-[0_0_0_1px_hsl(var(--secondary)/0.25)]',
        match.status === 'final' && 'border-border bg-muted/40 opacity-75',
      )}
    >
      {/* Columna izquierda: hora + status */}
      <div className="flex flex-row sm:flex-col gap-3 sm:gap-1.5 items-center sm:items-start justify-between sm:justify-start">
        <span className="text-[18px] font-semibold text-foreground leading-none">
          {formatMatchTime(kicksOffAt)}
        </span>
        <MatchStatusBadge status={match.status} />
      </div>

      {/* Columna derecha: equipos + score/vs.
       * `minmax(0,1fr)` (en lugar del default `minmax(auto,1fr)`) es clave:
       * sin esto, una columna 1fr se infla a su contenido intrínseco si es
       * más largo que el espacio disponible, y el texto de los slots
       * eliminatorios ("Tercer Lugar Grupos C/D/F/G/H") se salía del card. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center">
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
