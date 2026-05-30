import type { Team } from '@/lib/types/match';

interface UserBadgeProps {
  firstName: string;
  lastName: string;
  /** Equipo favorito del usuario; null si no escogió ninguno en onboarding. */
  favoriteTeam: Team | null;
}

/**
 * Chip de identidad del usuario en el header: nombre completo y
 * banderita del equipo favorito al lado. En pantallas muy estrechas
 * el nombre se trunca con elipsis (tooltip muestra el completo).
 */
export function UserBadge({ firstName, lastName, favoriteTeam }: UserBadgeProps) {
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-[260px]">
      <span
        className="text-sm font-medium text-foreground truncate"
        title={fullName}
      >
        {fullName}
      </span>
      {favoriteTeam && (
        <span
          className={`fi fi-${favoriteTeam.flag} rounded-sm flex-shrink-0 shadow-[0_0_0_1px_hsl(var(--border))]`}
          style={{ width: 22, height: 16 }}
          title={`Equipo favorito: ${favoriteTeam.name}`}
          aria-label={`Equipo favorito: ${favoriteTeam.name}`}
        />
      )}
    </div>
  );
}
