'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trophy, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WORLD_CUP_TEAMS } from '@/lib/validators/profile';
import { getAvatarVariants } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { saveProfile } from './actions';

export function OnboardingForm() {
  const [nickname, setNickname] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [generation, setGeneration] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const avatarVariants = useMemo(
    () => getAvatarVariants(nickname, generation),
    [nickname, generation],
  );

  // Resetear selección cuando cambia el set de variantes
  useEffect(() => {
    setSelectedIndex(0);
  }, [nickname, generation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveProfile({
        nickname,
        favorite_team: favoriteTeam || null,
        avatar_url: avatarVariants[selectedIndex],
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Galería de avatares */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Elige tu avatar</p>
          <button
            type="button"
            onClick={() => setGeneration((g) => g + 1)}
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              'text-tertiary hover:underline',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
              'rounded px-1',
              'disabled:opacity-50',
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Otras opciones
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {avatarVariants.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelectedIndex(i)}
              disabled={isPending}
              aria-label={`Avatar ${i + 1}`}
              aria-pressed={selectedIndex === i}
              className={cn(
                'aspect-square rounded-full overflow-hidden relative',
                'bg-muted transition-all duration-200',
                'hover:scale-105 focus-visible:outline-none',
                selectedIndex === i
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
                  : 'opacity-60 hover:opacity-100',
                'disabled:cursor-not-allowed',
              )}
            >
              <img src={url} alt="" className="h-full w-full" />
              {selectedIndex === i && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </motion.div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Tap en uno para seleccionarlo
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
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Preview con bandera del equipo seleccionado */}
        {(() => {
          const selectedTeam = WORLD_CUP_TEAMS.find((t) => t.code === favoriteTeam);
          if (!selectedTeam) return null;
          return (
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <span
                className={`fi fi-${selectedTeam.flag} rounded-sm`}
                aria-hidden="true"
              />
              <span>{selectedTeam.name}</span>
            </div>
          );
        })()}
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
