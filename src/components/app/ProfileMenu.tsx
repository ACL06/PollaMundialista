'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AtSign, Check, Mail, Phone, RefreshCw, Trophy, User, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NAME_REGEX, PHONE_REGEX, WORLD_CUP_TEAMS } from '@/lib/validators/profile';
import { getAvatarVariants } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { UserBadge } from '@/components/app/UserBadge';
import type { Team } from '@/lib/types/match';
import { updateProfile } from '@/app/(app)/actions';

interface ProfileMenuProps {
  email: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string;
  /** Equipo favorito (objeto Team con bandera) para el badge y el modal. */
  favoriteTeam: Team | null;
}

function sanitizePhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 15);
}

function nameError(v: string): string | null {
  if (v.length === 0) return null;
  if (!NAME_REGEX.test(v)) return 'Solo letras y espacios';
  return null;
}

export function ProfileMenu({
  email,
  avatarUrl,
  firstName,
  lastName,
  nickname,
  phone,
  favoriteTeam,
}: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Nombre + bandera (también abre el perfil) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Editar mi perfil"
          title="Editar mi perfil"
          className={cn(
            'min-w-0 rounded-md px-1.5 py-1 hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
          )}
        >
          <UserBadge firstName={firstName} lastName={lastName} favoriteTeam={favoriteTeam} />
        </button>

        <div className="h-6 w-px bg-border" aria-hidden="true" />

        {/* Avatar */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Editar mi perfil"
          className={cn(
            'h-9 w-9 rounded-full overflow-hidden border border-border bg-muted flex-shrink-0',
            'transition-transform hover:scale-105',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-4 w-4" />
            </span>
          )}
        </button>
      </div>

      <ProfileModal
        open={open}
        onClose={() => setOpen(false)}
        email={email}
        initial={{
          firstName,
          lastName,
          nickname,
          phone,
          avatarUrl,
          favoriteTeam: favoriteTeam?.code ?? null,
        }}
        onSaved={() => {
          setOpen(false);
          router.refresh(); // refresca los server components (header, etc.)
        }}
      />
    </>
  );
}

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  initial: {
    firstName: string;
    lastName: string;
    nickname: string;
    phone: string;
    avatarUrl: string | null;
    favoriteTeam: string | null;
  };
  onSaved: () => void;
}

function ProfileModal({ open, onClose, email, initial, onSaved }: ProfileModalProps) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [nickname, setNickname] = useState(initial.nickname);
  const [phone, setPhone] = useState(initial.phone);
  const [avatar, setAvatar] = useState<string | null>(initial.avatarUrl);
  const [favorite, setFavorite] = useState(initial.favoriteTeam ?? '');
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Opciones del galería: el avatar seleccionado y el actual van primero
  // (siempre visibles y resaltables), luego las 6 variantes de la generación.
  // Sin duplicados.
  const avatarOptions = useMemo(() => {
    const variants = getAvatarVariants(generation);
    const ordered = [avatar, initial.avatarUrl, ...variants].filter(Boolean) as string[];
    return Array.from(new Set(ordered));
  }, [avatar, initial.avatarUrl, generation]);

  // Resetear el form a los valores iniciales cada vez que se abre.
  useEffect(() => {
    if (open) {
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      setNickname(initial.nickname);
      setPhone(initial.phone);
      setAvatar(initial.avatarUrl);
      setFavorite(initial.favoriteTeam ?? '');
      setGeneration(0);
      setError(null);
    }
  }, [
    open,
    initial.firstName,
    initial.lastName,
    initial.nickname,
    initial.phone,
    initial.avatarUrl,
    initial.favoriteTeam,
  ]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const firstNameErr = nameError(firstName);
  const lastNameErr = nameError(lastName);
  const canSave =
    firstName.trim().length >= 2 &&
    !firstNameErr &&
    lastName.trim().length >= 2 &&
    !lastNameErr &&
    nickname.trim().length >= 3 &&
    PHONE_REGEX.test(phone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        nickname,
        phone,
        favorite_team: favorite || null,
        avatar_url: avatar ?? undefined,
      });
      if (result?.error) setError(result.error);
      else onSaved();
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Editar mi perfil"
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-6 space-y-5"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-foreground">Mi perfil</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-foreground">Avatar</label>
                  <button
                    type="button"
                    onClick={() => setGeneration((g) => g + 1)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-tertiary hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Otras opciones
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {avatarOptions.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        setAvatar(url);
                        if (error) setError(null);
                      }}
                      disabled={isPending}
                      aria-label="Elegir este avatar"
                      aria-pressed={avatar === url}
                      className={cn(
                        'aspect-square rounded-full overflow-hidden relative bg-muted transition-all duration-200',
                        'hover:scale-105 focus-visible:outline-none disabled:cursor-not-allowed',
                        avatar === url
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
                          : 'opacity-60 hover:opacity-100',
                      )}
                    >
                      <Image src={url} alt="" width={72} height={72} className="h-full w-full" unoptimized />
                      {avatar === url && (
                        <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email (no editable) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={email} disabled readOnly className="pl-10" />
                </div>
                <p className="text-xs text-muted-foreground">El correo no se puede cambiar.</p>
              </div>

              {/* Nombre */}
              <Field label="Nombre" Icon={User} error={firstNameErr}>
                <Input
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isPending}
                  error={!!firstNameErr}
                  className="pl-10"
                  maxLength={50}
                  autoComplete="given-name"
                />
              </Field>

              {/* Apellidos */}
              <Field label="Apellidos" Icon={Users} error={lastNameErr}>
                <Input
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isPending}
                  error={!!lastNameErr}
                  className="pl-10"
                  maxLength={50}
                  autoComplete="family-name"
                />
              </Field>

              {/* Nickname */}
              <Field label="Nickname" Icon={AtSign}>
                <Input
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isPending}
                  className="pl-10"
                  maxLength={20}
                  autoComplete="off"
                />
              </Field>

              {/* Celular */}
              <Field label="Celular" Icon={Phone}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    setPhone(sanitizePhone(e.target.value));
                    if (error) setError(null);
                  }}
                  disabled={isPending}
                  className="pl-10"
                  maxLength={15}
                  autoComplete="tel"
                />
              </Field>

              {/* Equipo favorito */}
              <div className="space-y-1.5">
                <label htmlFor="profile_favorite_team" className="block text-sm font-medium text-foreground">
                  Equipo favorito{' '}
                  <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <select
                    id="profile_favorite_team"
                    value={favorite}
                    onChange={(e) => {
                      setFavorite(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={isPending}
                    className={cn(
                      'w-full h-11 pl-10 pr-4 rounded-lg appearance-none bg-surface text-foreground',
                      'border border-border transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <option value="">Sin equipo favorito</option>
                    {WORLD_CUP_TEAMS.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const selected = WORLD_CUP_TEAMS.find((t) => t.code === favorite);
                  if (!selected) return null;
                  return (
                    <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                      <span className={`fi fi-${selected.flag} rounded-sm`} aria-hidden="true" />
                      <span>{selected.name}</span>
                    </div>
                  );
                })()}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={isPending} disabled={!canSave} fullWidth>
                  Guardar cambios
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-4 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  Icon,
  error,
  children,
}: {
  label: string;
  Icon: typeof User;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        {children}
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
