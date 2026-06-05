'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  Phone,
  AtSign,
  Trophy,
  AlertCircle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  NAME_REGEX,
  NICKNAME_ERROR,
  NICKNAME_REGEX,
  PHONE_REGEX,
  WORLD_CUP_TEAMS,
} from '@/lib/validators/profile';
import { getAvatarVariants } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { saveProfile } from './actions';

/** Permitir solo dígitos y limitar a 15 caracteres (máximo internacional E.164). */
function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

/**
 * Devuelve el mensaje de error a mostrar inline para un campo de nombre.
 * El input se deja tal como el usuario lo tipeó (no se filtran caracteres),
 * pero si contiene algo distinto a letras y espacios, le avisamos.
 */
function getNameError(value: string): string | null {
  if (value.length === 0) return null;
  if (!NAME_REGEX.test(value)) {
    return 'Solo se permiten letras y espacios — sin números ni símbolos';
  }
  return null;
}

/**
 * Error inline del nickname. El largo mínimo (3) ya lo exige el botón; aquí
 * avisamos de caracteres inválidos en cuanto el nickname tiene largo suficiente.
 */
function getNicknameError(value: string): string | null {
  if (value.length >= 3 && !NICKNAME_REGEX.test(value)) return NICKNAME_ERROR;
  return null;
}

export function OnboardingForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [generation, setGeneration] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Errores por campo devueltos por el server (Zod o nickname duplicado).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Limpia el error general y el del campo tocado (al editar ese campo).
  const clearFieldError = (key: string) => {
    setError(null);
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const avatarVariants = useMemo(() => getAvatarVariants(generation), [generation]);

  // Resetear selección solo cuando se piden "Otras opciones" (cambia el set).
  useEffect(() => {
    setSelectedIndex(0);
  }, [generation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await saveProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        nickname,
        favorite_team: favoriteTeam || null,
        avatar_url: avatarVariants[selectedIndex],
      });
      if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
      if (result?.error) setError(result.error);
    });
  };

  // Errores en vivo por campo. Se calculan a partir del valor actual,
  // sin tocar lo que tipeó el usuario.
  const firstNameError = getNameError(firstName);
  const lastNameError = getNameError(lastName);
  const nicknameError = getNicknameError(nickname);

  // Mensaje a mostrar por campo: el error en vivo (cliente) o, si no, el del
  // server (Zod o nickname duplicado). Así marcamos el campo puntual.
  const firstNameMsg = firstNameError ?? fieldErrors.first_name ?? null;
  const lastNameMsg = lastNameError ?? fieldErrors.last_name ?? null;
  const phoneMsg = fieldErrors.phone ?? null;
  const nicknameMsg = nicknameError ?? fieldErrors.nickname ?? null;

  // El botón "Guardar y continuar" se habilita solo cuando todos los
  // campos obligatorios tienen un valor válido. La validación estricta
  // la repite Zod en el server action.
  const canSubmit =
    firstName.length >= 2 &&
    !firstNameError &&
    lastName.length >= 2 &&
    !lastNameError &&
    PHONE_REGEX.test(phone) &&
    nickname.length >= 3 &&
    !nicknameError;

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
              <Image
                src={url}
                alt=""
                width={96}
                height={96}
                className="h-full w-full"
                unoptimized
              />
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

      {/* Nombre */}
      <div className="space-y-1.5">
        <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
          Nombre <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="first_name"
            type="text"
            placeholder="ej: Pepito"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearFieldError('first_name');
            }}
            disabled={isPending}
            error={!!firstNameMsg}
            className="pl-10"
            autoComplete="given-name"
            maxLength={50}
            required
          />
        </div>
        {firstNameMsg ? (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {firstNameMsg}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Solo letras y espacios.</p>
        )}
      </div>

      {/* Apellidos */}
      <div className="space-y-1.5">
        <label htmlFor="last_name" className="block text-sm font-medium text-foreground">
          Apellidos <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="last_name"
            type="text"
            placeholder="ej: Castaño Pérez"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearFieldError('last_name');
            }}
            disabled={isPending}
            error={!!lastNameMsg}
            className="pl-10"
            autoComplete="family-name"
            maxLength={50}
            required
          />
        </div>
        {lastNameMsg ? (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {lastNameMsg}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Solo letras y espacios.</p>
        )}
      </div>

      {/* Celular */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          Celular <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="3001234567"
            value={phone}
            onChange={(e) => {
              setPhone(sanitizePhone(e.target.value));
              clearFieldError('phone');
            }}
            disabled={isPending}
            error={!!phoneMsg}
            className="pl-10"
            autoComplete="tel"
            maxLength={15}
            required
          />
        </div>
        {phoneMsg ? (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {phoneMsg}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Solo números, entre 7 y 15 dígitos (sin espacios ni símbolos).
          </p>
        )}
      </div>

      {/* Nickname */}
      <div className="space-y-1.5">
        <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
          Nickname <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="nickname"
            type="text"
            placeholder="ej: ElProfe10"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              clearFieldError('nickname');
            }}
            disabled={isPending}
            error={!!nicknameMsg}
            className="pl-10"
            autoComplete="off"
            maxLength={20}
            required
          />
        </div>
        {nicknameMsg ? (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {nicknameMsg}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            3–20 caracteres. Solo letras, números, puntos y guiones.
          </p>
        )}
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
        disabled={!canSubmit}
      >
        Guardar y continuar
      </Button>
    </form>
  );
}
