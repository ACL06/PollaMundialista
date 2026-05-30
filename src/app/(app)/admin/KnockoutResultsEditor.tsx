'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatBracketSource } from '@/lib/format-bracket-source';
import { cn } from '@/lib/utils';
import type { Match, MatchStage, MatchStatus, Team } from '@/lib/types/match';
import { saveKnockoutMatch } from './actions';

interface KnockoutResultsEditorProps {
  matches: Match[];
  teams: Team[];
}

interface Draft {
  homeCode: string; // '' = por definir
  awayCode: string;
  home: string;
  away: string;
  status: MatchStatus;
}

const STAGE_LABEL: Partial<Record<MatchStage, string>> = {
  r32: 'Dieciseisavos de Final',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  '3rd': 'Tercer Puesto',
  final: 'Final',
};

const STAGE_ORDER: MatchStage[] = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'];

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  final: 'Final',
};

function sanitizeScore(v: string): string {
  return v.replace(/\D/g, '').slice(0, 2);
}

export function KnockoutResultsEditor({ matches, teams }: KnockoutResultsEditorProps) {
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const [drafts, setDrafts] = useState<Map<string, Draft>>(() => {
    const map = new Map<string, Draft>();
    for (const m of matches) {
      map.set(m.id, {
        homeCode: m.home_team?.code ?? '',
        awayCode: m.away_team?.code ?? '',
        home: m.home_score != null ? String(m.home_score) : '',
        away: m.away_score != null ? String(m.away_score) : '',
        status: m.status,
      });
    }
    return map;
  });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [, startSave] = useTransition();

  // Agrupar por ronda en orden
  const rounds = useMemo(() => {
    const byStage = new Map<MatchStage, Match[]>();
    for (const m of matches) {
      if (!byStage.has(m.stage)) byStage.set(m.stage, []);
      byStage.get(m.stage)!.push(m);
    }
    return STAGE_ORDER.filter((s) => byStage.has(s)).map((s) => ({
      stage: s,
      label: STAGE_LABEL[s] ?? s,
      matches: (byStage.get(s) ?? []).sort((a, b) => a.match_number - b.match_number),
    }));
  }, [matches]);

  const [activeStage, setActiveStage] = useState<MatchStage>(rounds[0]?.stage ?? 'r32');
  const activeRound = rounds.find((r) => r.stage === activeStage) ?? rounds[0];

  const setError = (id: string, msg: string | null) => {
    setErrors((prev) => {
      const next = new Map(prev);
      if (msg === null) next.delete(id);
      else next.set(id, msg);
      return next;
    });
  };

  const update = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, ...patch });
      return next;
    });
    setSavedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Cambia un campo y persiste con el valor YA calculado (evita stale closure).
  const changeAndPersist = (id: string, patch: Partial<Draft>) => {
    const current = drafts.get(id);
    if (!current) return;
    update(id, patch);
    persist(id, { ...current, ...patch });
  };

  const persist = (id: string, override?: Draft) => {
    const d = override ?? drafts.get(id);
    if (!d) return;
    if (d.homeCode && d.awayCode && d.homeCode === d.awayCode) {
      setError(id, 'Un equipo no puede jugar contra sí mismo');
      return;
    }
    if (d.status === 'final' && (d.home === '' || d.away === '' || !d.homeCode || !d.awayCode)) {
      setError(id, 'Para marcar Final: ambos equipos y ambos marcadores');
      return;
    }

    startSave(async () => {
      const res = await saveKnockoutMatch({
        matchId: id,
        homeTeamCode: d.homeCode || null,
        awayTeamCode: d.awayCode || null,
        homeScore: d.home === '' ? null : Number(d.home),
        awayScore: d.away === '' ? null : Number(d.away),
        status: d.status,
      });
      if (res.error) {
        setError(id, res.error);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        setError(id, null);
        setSavedIds((prev) => new Set(prev).add(id));
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Tabs por ronda */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" role="tablist">
        {rounds.map((r) => {
          const isActive = r.stage === activeRound?.stage;
          return (
            <button
              key={r.stage}
              type="button"
              onClick={() => setActiveStage(r.stage)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {activeRound && (
        <div className="space-y-3">
          {activeRound.matches.map((match) => {
            const d = drafts.get(match.id)!;
            const err = errors.get(match.id) ?? null;
            const saved = savedIds.has(match.id);
            return (
              <article
                key={match.id}
                className={cn(
                  'border rounded-lg px-4 py-3 flex flex-col gap-3',
                  err ? 'border-destructive bg-destructive/5' : saved ? 'border-primary/40 bg-primary/[0.03]' : 'border-border bg-surface',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Partido #{match.match_number} · {match.venue}</span>
                  {saved && (
                    <span className="inline-flex items-center gap-1 text-primary font-semibold uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      Guardado
                    </span>
                  )}
                </div>

                {/* Selectores de equipo + marcador */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-start">
                  <TeamSelect
                    value={d.homeCode}
                    hint={match.bracket_source_home}
                    teams={sortedTeams}
                    onChange={(code) => changeAndPersist(match.id, { homeCode: code })}
                  />
                  <div className="flex items-center gap-1.5 justify-center pt-0.5">
                    <ScoreInput value={d.home} onChange={(v) => update(match.id, { home: sanitizeScore(v) })} onBlur={() => persist(match.id)} />
                    <span className="text-muted-foreground font-mono">–</span>
                    <ScoreInput value={d.away} onChange={(v) => update(match.id, { away: sanitizeScore(v) })} onBlur={() => persist(match.id)} />
                  </div>
                  <TeamSelect
                    value={d.awayCode}
                    hint={match.bracket_source_away}
                    teams={sortedTeams}
                    onChange={(code) => changeAndPersist(match.id, { awayCode: code })}
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {(['scheduled', 'live', 'final'] as MatchStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        update(match.id, { status: s });
                        setTimeout(() => persist(match.id), 0);
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors',
                        d.status === s
                          ? s === 'final'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : s === 'live'
                              ? 'border-destructive bg-destructive/10 text-destructive'
                              : 'border-foreground/30 bg-muted text-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>

                {err && (
                  <div className="flex items-center gap-1.5 text-[12px] text-destructive" role="alert">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {err}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamSelect({
  value,
  hint,
  teams,
  onChange,
}: {
  value: string;
  hint: string | null;
  teams: Team[];
  onChange: (code: string) => void;
}) {
  return (
    <div className="space-y-1 min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-2 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-tertiary"
      >
        <option value="">— por definir —</option>
        {teams.map((t) => (
          <option key={t.code} value={t.code}>
            {t.name}
          </option>
        ))}
      </select>
      {hint && (
        <p className="text-[11px] text-muted-foreground truncate" title={formatBracketSource(hint)}>
          {formatBracketSource(hint)}
        </p>
      )}
    </div>
  );
}

function ScoreInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      placeholder="–"
      maxLength={2}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-11 h-9 text-center font-mono font-bold text-[18px] tabular-nums bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tertiary"
    />
  );
}
