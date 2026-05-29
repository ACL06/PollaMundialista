import { cn } from '@/lib/utils';
import type { Standing } from '@/lib/compute-standings';

interface GroupTableProps {
  groupCode: string;
  standings: Standing[];
}

const STAT_COLS: Array<{ key: keyof Standing; label: string; title: string }> = [
  { key: 'played', label: 'PJ', title: 'Partidos jugados' },
  { key: 'wins', label: 'G', title: 'Ganados' },
  { key: 'draws', label: 'E', title: 'Empatados' },
  { key: 'losses', label: 'P', title: 'Perdidos' },
  { key: 'goalsFor', label: 'GF', title: 'Goles a favor' },
  { key: 'goalsAgainst', label: 'GC', title: 'Goles en contra' },
  { key: 'goalDifference', label: 'DG', title: 'Diferencia de goles' },
  { key: 'points', label: 'Pts', title: 'Puntos' },
];

export function GroupTable({ groupCode, standings }: GroupTableProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-bold text-foreground">Grupo {groupCode}</h2>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left font-medium pl-1 pr-2 py-2 w-6">#</th>
              <th className="text-left font-medium px-2 py-2">Equipo</th>
              {STAT_COLS.map(({ key, label, title }) => (
                <th
                  key={key}
                  title={title}
                  className={cn(
                    'text-center font-medium px-2 py-2 w-9',
                    key === 'points' && 'text-foreground font-semibold',
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.team.code}
                className={cn(
                  'border-b border-border/50 last:border-b-0',
                  // Las dos primeras posiciones clasifican directo a R32.
                  // Se marcan con tinte de fondo en vez de border-l porque
                  // el border-collapse de la tabla hacía que el borde de
                  // la fila 2 se viera también sobre la fila 3.
                  i < 2 && 'bg-primary/10',
                )}
              >
                <td
                  className={cn(
                    'pl-1 pr-2 py-2.5 text-xs tabular-nums',
                    i < 2 ? 'text-primary font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </td>
                <td className="px-2 py-2.5">
                  <div className="inline-flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        `fi fi-${s.team.flag} rounded-sm flex-shrink-0`,
                        'shadow-[0_0_0_1px_hsl(var(--border))]',
                      )}
                      style={{ width: 22, height: 16 }}
                      aria-hidden="true"
                    />
                    <span className="text-foreground font-medium truncate">
                      {s.team.name}
                    </span>
                  </div>
                </td>
                {STAT_COLS.map(({ key }) => (
                  <td
                    key={key}
                    className={cn(
                      'text-center px-2 py-2.5 tabular-nums',
                      key === 'points'
                        ? 'text-foreground font-bold'
                        : 'text-muted-foreground',
                    )}
                  >
                    {s[key] as number}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
