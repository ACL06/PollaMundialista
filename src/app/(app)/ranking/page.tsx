import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Countdown } from '@/components/pronosticos/Countdown';
import { loadRanking } from './load-ranking';
import { RankingView } from './RankingView';

export const metadata = { title: 'Ranking' };

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { lockAt, locked, hasResults, rows } = await loadRanking();

  // El ranking se abre con el lock (sin resultados no tiene sentido, y los
  // pronósticos de otros solo son legibles post-lock).
  if (!locked) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center flex flex-col items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Ranking</h1>
        <p className="text-muted-foreground">
          El ranking se activa cuando arranca el Mundial y empiezan a registrarse resultados.
        </p>
        {lockAt && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Se activa en
            </p>
            <Countdown targetIsoDate={lockAt.toISOString()} />
          </div>
        )}
      </div>
    );
  }

  return <RankingView rows={rows} currentUserId={user.id} hasResults={hasResults} />;
}
