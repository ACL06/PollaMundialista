'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react';
import { computeGroupStandings, type GroupStandingOverride, type Standing } from '@/lib/compute-standings';
import { cn } from '@/lib/utils';
import type { Match, Team } from '@/lib/types/match';
import { saveGroupStandings } from './actions';

const MAX_THIRDS = 8;

interface GroupStandingsEditorProps {
  groupMatches: Match[];
  teams: Team[];
  initialOverrides: GroupStandingOverride[];
}

/**
 * Override manual del orden de los grupos + selección de los 8 mejores
 * terceros. SOLO afecta la tabla de /grupos (display); el scoring se deriva
 * aparte (equipos asignados a R32). El admin reordena con flechas y marca el
 * 3° que clasifica (tope global de 8). Cada cambio persiste el grupo entero.
 */
export function GroupStandingsEditor({
  groupMatches,
  teams,
  initialOverrides,
}: GroupStandingsEditorProps) {
  const standingsByGroup = useMemo(
    () => computeGroupStandings(groupMatches, teams),
    [groupMatches, teams],
  );
  const standingByTeam = useMemo(() => {
    const m = new Map<string, Standing>();
    for (const [, list] of standingsByGroup) for (const s of list) m.set(s.team.code, s);
    return m;
  }, [standingsByGroup]);
  const groupCodes = useMemo(
    () => Array.from(standingsByGroup.keys()).sort(),
    [standingsByGroup],
  );

  // Orden inicial por grupo: el override del admin si los 4 equipos lo tienen;
  // si no, el orden automático (tie-break simplificado).
  const [order, setOrder] = useState<Map<string, string[]>>(() => {
    const ovByTeam = new Map(initialOverrides.map((o) => [o.team_code, o]));
    const map = new Map<string, string[]>();
    for (const code of groupCodes) {
      const list = standingsByGroup.get(code) ?? [];
      const allOv = list.length > 0 && list.every((s) => ovByTeam.has(s.team.code));
      const codes = allOv
        ? [...list]
            .sort((a, b) => ovByTeam.get(a.team.code)!.position - ovByTeam.get(b.team.code)!.position)
            .map((s) => s.team.code)
        : list.map((s) => s.team.code);
      map.set(code, codes);
    }
    return map;
  });
  const [thirds, setThirds] = useState<Set<string>>(
    () => new Set(initialOverrides.filter((o) => o.third_qualifies).map((o) => o.team_code)),
  );
  const [savedGroup, setSavedGroup] = useState<string | null>(null);
  const [errorGroup, setErrorGroup] = useState<string | null>(null);
  const [, startSave] = useTransition();

  const persist = (code: string, codes: string[], thirdsSet: Set<string>) => {
    const entries = codes.map((teamCode, i) => ({
      teamCode,
      position: i + 1,
      thirdQualifies: i === 2 && thirdsSet.has(teamCode), // solo el 3° clasifica como tercero
    }));
    setSavedGroup(null);
    startSave(async () => {
      const res = await saveGroupStandings({ entries });
      if (res.error) {
        setErrorGroup(code);
      } else {
        setErrorGroup(null);
        setSavedGroup(code);
      }
    });
  };

  const move = (code: string, index: number, dir: -1 | 1) => {
    const codes = [...(order.get(code) ?? [])];
    const j = index + dir;
    if (j < 0 || j >= codes.length) return;
    [codes[index], codes[j]] = [codes[j], codes[index]];
    // Reordenar puede sacar a un equipo de la 3.ª posición → pierde su flag de
    // tercero (solo el que queda en posición 3 puede estar marcado).
    const nextThirds = new Set(thirds);
    codes.forEach((tc, i) => {
      if (i !== 2) nextThirds.delete(tc);
    });
    setOrder((prev) => new Map(prev).set(code, codes));
    setThirds(nextThirds);
    persist(code, codes, nextThirds);
  };

  const toggleThird = (code: string, teamCode: string) => {
    const next = new Set(thirds);
    if (next.has(teamCode)) {
      next.delete(teamCode);
    } else {
      if (next.size >= MAX_THIRDS) return; // tope de 8
      next.add(teamCode);
    }
    setThirds(next);
    persist(code, order.get(code) ?? [], next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Orden de los grupos
        </h2>
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            thirds.size === MAX_THIRDS ? 'text-primary' : 'text-foreground',
          )}
        >
          {thirds.size}/{MAX_THIRDS} mejores terceros
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Reordena con las flechas cuando haya empate y marca los 3.° que clasifican. Esto solo
        ajusta la tabla de <span className="font-medium text-foreground">Fase de grupos</span> que
        ven todos — no cambia los puntos (esos salen de los cruces de eliminatoria).
      </p>

      <div className="flex flex-col gap-5">
        {groupCodes.map((code) => {
          const codes = order.get(code) ?? [];
          return (
            <section key={code} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Grupo {code}</h3>
                {savedGroup === code && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    Guardado
                  </span>
                )}
                {errorGroup === code && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    No se pudo guardar
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {codes.map((teamCode, i) => {
                  const s = standingByTeam.get(teamCode);
                  if (!s) return null;
                  const qualifies = i < 2 || (i === 2 && thirds.has(teamCode));
                  const canMarkThird = i === 2 && (thirds.has(teamCode) || thirds.size < MAX_THIRDS);
                  return (
                    <li
                      key={teamCode}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2',
                        qualifies ? 'border-primary/40 bg-primary/[0.05]' : 'border-border bg-surface',
                      )}
                    >
                      <span className="w-4 text-right text-xs font-bold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <span
                        className={`fi fi-${s.team.flag} rounded-sm flex-shrink-0 shadow-[0_0_0_1px_hsl(var(--border))]`}
                        style={{ width: 22, height: 16 }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {s.team.name}
                      </span>
                      <span className="flex-shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {s.points} pts · {s.goalDifference >= 0 ? '+' : ''}
                        {s.goalDifference} · {s.goalsFor} GF
                      </span>
                      {i === 2 && (
                        <label
                          className={cn(
                            'flex flex-shrink-0 items-center gap-1 text-[11px] font-medium',
                            canMarkThird ? 'cursor-pointer text-foreground' : 'cursor-not-allowed text-muted-foreground/50',
                          )}
                          title={
                            canMarkThird
                              ? 'Clasifica como mejor tercero'
                              : 'Ya hay 8 mejores terceros'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={thirds.has(teamCode)}
                            disabled={!canMarkThird}
                            onChange={() => toggleThird(code, teamCode)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          3.°
                        </label>
                      )}
                      <span className="flex flex-shrink-0 gap-0.5">
                        <button
                          type="button"
                          aria-label="Subir"
                          disabled={i === 0}
                          onClick={() => move(code, i, -1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Bajar"
                          disabled={i === codes.length - 1}
                          onClick={() => move(code, i, 1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
