'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import {
  formatMatchDateKey,
  formatMatchDateLong,
  formatMatchDateShort,
  formatMatchTime,
} from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Match, MatchStatus, Team } from '@/lib/types/match';
import { saveMatchResult, saveTopScorer } from './actions';
import { KnockoutResultsEditor } from './KnockoutResultsEditor';
import { EnrollmentEditor, type EnrollmentUser } from './EnrollmentEditor';

interface AdminPanelProps {
  groupMatches: Match[];
  knockoutMatches: Match[];
  teams: Team[];
  initialTopScorer: string | null;
  enrollmentUsers: EnrollmentUser[];
}

type AdminView = 'grupos' | 'eliminatorias' | 'inscripciones';

const VIEW_LABEL: Record<AdminView, string> = {
  grupos: 'Fase de grupos',
  eliminatorias: 'Eliminatorias',
  inscripciones: 'Inscripciones',
};

interface Draft {
  home: string;
  away: string;
  status: MatchStatus;
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  final: 'Final',
  suspended: 'Suspendido',
};

function sanitizeScore(v: string): string {
  return v.replace(/\D/g, '').slice(0, 2);
}

function matchToDraft(m: Match): Draft {
  return {
    home: m.home_score != null ? String(m.home_score) : '',
    away: m.away_score != null ? String(m.away_score) : '',
    status: m.status,
  };
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return a.home === b.home && a.away === b.away && a.status === b.status;
}

export function AdminPanel({
  groupMatches,
  knockoutMatches,
  teams,
  initialTopScorer,
  enrollmentUsers,
}: AdminPanelProps) {
  const [view, setView] = useState<AdminView>('grupos');
  const [drafts, setDrafts] = useState<Map<string, Draft>>(() => {
    const map = new Map<string, Draft>();
    for (const m of groupMatches) map.set(m.id, matchToDraft(m));
    return map;
  });
  // Último valor PERSISTIDO por partido (baseline). Sirve para no re-guardar
  // —ni marcar "Guardado"— cuando el admin solo entra y sale de una casilla
  // sin cambiar nada (#4). Se actualiza tras cada guardado exitoso.
  const persistedRef = useRef<Map<string, Draft> | null>(null);
  if (persistedRef.current === null) {
    persistedRef.current = new Map(groupMatches.map((m) => [m.id, matchToDraft(m)]));
  }
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [, startSave] = useTransition();

  const [topScorer, setTopScorer] = useState(initialTopScorer ?? '');
  const [topScorerSaved, setTopScorerSaved] = useState(false);
  const persistedScorerRef = useRef<string>(initialTopScorer ?? '');
  const [, startScorerSave] = useTransition();

  const days = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; matches: Match[] }>();
    for (const m of groupMatches) {
      const date = new Date(m.kicks_off_at);
      const key = formatMatchDateKey(date);
      if (!grouped.has(key)) grouped.set(key, { key, label: formatMatchDateLong(date), matches: [] });
      grouped.get(key)!.matches.push(m);
    }
    return Array.from(grouped.values());
  }, [groupMatches]);

  // Por defecto el día de hoy (o el más cercano hacia adelante; si no, el
  // último) — como en Comunidad, para no caer siempre en el día inaugural.
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    if (days.length === 0) return '';
    const todayKey = formatMatchDateKey(new Date());
    const today = days.find((d) => d.key === todayKey);
    if (today) return today.key;
    const upcoming = days.find((d) => d.key >= todayKey);
    return (upcoming ?? days[days.length - 1]).key;
  });
  const selectedDay = days.find((d) => d.key === selectedDayKey) ?? days[0];

  const finalCount = useMemo(() => {
    let n = 0;
    for (const d of drafts.values()) if (d.status === 'final') n += 1;
    return n;
  }, [drafts]);

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

  // Cambia un campo y persiste con el valor YA calculado — evita el stale
  // closure de `setState` + leer el state viejo en el mismo tick.
  const changeAndPersist = (id: string, patch: Partial<Draft>) => {
    const current = drafts.get(id);
    if (!current) return;
    update(id, patch);
    persist(id, { ...current, ...patch });
  };

  const persist = (id: string, override?: Draft) => {
    const d = override ?? drafts.get(id);
    if (!d) return;
    // #4: no guardar (ni marcar "Guardado") si nada cambió respecto a lo último
    // persistido — p.ej. el admin solo entra y sale de una casilla sin tocarla.
    const baseline = persistedRef.current?.get(id);
    if (baseline && draftsEqual(baseline, d)) return;
    // Si marca final, exige ambos marcadores
    if (d.status === 'final' && (d.home === '' || d.away === '')) {
      setError(id, 'Para marcar Final, ingresa ambos marcadores');
      return;
    }
    const home = d.home === '' ? null : Number(d.home);
    const away = d.away === '' ? null : Number(d.away);

    startSave(async () => {
      const res = await saveMatchResult({ matchId: id, homeScore: home, awayScore: away, status: d.status });
      if (res.error) {
        setError(id, res.error);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        persistedRef.current?.set(id, { ...d });
        setError(id, null);
        setSavedIds((prev) => new Set(prev).add(id));
      }
    });
  };

  const persistTopScorer = () => {
    // #4: no re-guardar ni marcar "Guardado" si no cambió respecto a lo persistido.
    if (topScorer.trim() === persistedScorerRef.current.trim()) return;
    startScorerSave(async () => {
      const res = await saveTopScorer(topScorer);
      if (!res.error) {
        persistedScorerRef.current = topScorer;
        setTopScorerSaved(true);
      } else {
        setTopScorerSaved(false);
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-1">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Panel admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra los resultados oficiales. Esto alimenta el scoring, el ranking y las tablas.{' '}
          <span className="font-medium text-foreground">{finalCount}/{groupMatches.length}</span>{' '}
          partidos finalizados.
        </p>
      </header>

      {/* Goleador oficial */}
      <section className="bg-surface border border-border rounded-lg p-4 space-y-2">
        <label htmlFor="top_scorer" className="block text-sm font-semibold text-foreground">
          Goleador oficial del torneo
        </label>
        <div className="flex gap-2">
          <input
            id="top_scorer"
            type="text"
            value={topScorer}
            placeholder="ej: Kylian Mbappé"
            maxLength={80}
            onChange={(e) => {
              setTopScorer(e.target.value);
              setTopScorerSaved(false);
            }}
            onBlur={persistTopScorer}
            className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
          {topScorerSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary self-center">
              <CheckCircle2 className="h-4 w-4" />
              Guardado
            </span>
          )}
        </div>
      </section>

      {/* Switcher Grupos / Eliminatorias / Inscripciones */}
      <div className="inline-flex gap-1 p-1 bg-muted rounded-lg self-start">
        {(['grupos', 'eliminatorias', 'inscripciones'] as AdminView[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === v ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      {view === 'eliminatorias' ? (
        <KnockoutResultsEditor matches={knockoutMatches} teams={teams} />
      ) : view === 'inscripciones' ? (
        <EnrollmentEditor users={enrollmentUsers} />
      ) : (
        <>
      {/* Tabs por día */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" role="tablist">
        {days.map((day) => {
          const finals = day.matches.filter((m) => drafts.get(m.id)?.status === 'final').length;
          const isActive = day.key === selectedDay?.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDayKey(day.key)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {formatMatchDateShort(new Date(day.matches[0].kicks_off_at))}
              <span className="ml-1.5 opacity-70 tabular-nums">{finals}/{day.matches.length}</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedDay.label}
          </h2>
          {selectedDay.matches.map((match) => {
            const d = drafts.get(match.id)!;
            const err = errors.get(match.id) ?? null;
            const saved = savedIds.has(match.id);
            return (
              <article
                key={match.id}
                className={cn(
                  'border rounded-lg px-4 py-3 flex flex-col gap-2.5',
                  err ? 'border-destructive bg-destructive/5' : saved ? 'border-primary/40 bg-primary/[0.03]' : 'border-border bg-surface',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{formatMatchTime(new Date(match.kicks_off_at))} · Grupo {match.group_code}</span>
                  {saved && (
                    <span className="inline-flex items-center gap-1 text-primary font-semibold uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      Guardado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
                  {match.home_team && <TeamLabel team={match.home_team} align="right" />}
                  <div className="flex items-center gap-1.5">
                    <ScoreInput value={d.home} onChange={(v) => update(match.id, { home: sanitizeScore(v) })} onBlur={() => persist(match.id)} />
                    <span className="text-muted-foreground font-mono">–</span>
                    <ScoreInput value={d.away} onChange={(v) => update(match.id, { away: sanitizeScore(v) })} onBlur={() => persist(match.id)} />
                  </div>
                  {match.away_team && <TeamLabel team={match.away_team} align="left" />}
                </div>

                <div className="flex items-center gap-2">
                  {(['scheduled', 'live', 'final', 'suspended'] as MatchStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeAndPersist(match.id, { status: s })}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors',
                        d.status === s
                          ? s === 'final'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : s === 'live'
                              ? 'border-destructive bg-destructive/10 text-destructive'
                              : s === 'suspended'
                                ? 'border-amber-500 bg-amber-500/10 text-amber-600'
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
        </>
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
