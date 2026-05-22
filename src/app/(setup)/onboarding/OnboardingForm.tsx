'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trophy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WORLD_CUP_TEAMS } from '@/lib/validators/profile';
import { getAvatarUrl } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { saveProfile } from './actions';

export function OnboardingForm() {
  const [nickname, setNickname] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const avatarSeed = nickname.length >= 2 ? nickname : 'default';
  const avatarUrl = getAvatarUrl(avatarSeed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveProfile({
        nickname,
        favorite_team: favoriteTeam || null,
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
          <img
            src={avatarUrl}
            alt="Vista previa de tu avatar"
            className="h-full w-full"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tu avatar se genera a partir de tu nickname
        </p>
      </div>

      {/* Nickname */}
      <div className="space-y-1.5">
        <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
          Nickname <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="nickname"
            type="text"
            placeholder="ej: ElProfe10"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (error) setError(null);
            }}
            disabled={isPending}
            error={!!error}
            className="pl-10"
            autoComplete="off"
            maxLength={20}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          3–20 caracteres. Solo letras, números, puntos y guiones.
        </p>
      </div>

      {/* Equipo favorito */}
      <div className="space-y-1.5">
        <label htmlFor="favorite_team" className="block text-sm font-medium text-foreground">
          Equipo favorito{' '}
          <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            id="favorite_team"
            value={favoriteTeam}
            onChange={(e) => setFavoriteTeam(e.target.value)}
            disabled={isPending}
            className={cn(
              'w-full h-11 pl-10 pr-4 rounded-lg appearance-none',
              'bg-surface text-foreground',
              'border border-border',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <option value="">Sin equipo favorito</option>
            {WORLD_CUP_TEAMS.map((team) => (
              <option key={team.code} value={team.code}>
                {team.flag} {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={isPending}
        disabled={nickname.length < 3}
      >
        Guardar y continuar
      </Button>
    </form>
  );
}
