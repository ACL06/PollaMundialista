import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Logo del proyecto renderizado inline como SVG.
 * Los trazos de la pelota y el texto principal usan currentColor
 * para adaptarse automáticamente al tema (claro/oscuro).
 * Los acentos tricolor (verde, azul, rojo) son siempre fijos.
 */
export function Logo({ variant = 'full', className, width, height }: LogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 140 140"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Polla Mundialista"
        width={width ?? 48}
        height={height ?? 48}
        className={cn('text-foreground', className)}
      >
        <g fill="none" strokeWidth="5.5" strokeLinecap="round">
          <path d="M 28 48 A 52 52 0 0 1 96 24" stroke="#1A8754" className="dark:stroke-[#26C281]" />
          <path d="M 114 52 A 52 52 0 0 1 114 88" stroke="#1E4FD9" className="dark:stroke-[#3D7BFF]" />
          <path d="M 96 116 A 52 52 0 0 1 30 96" stroke="#D80027" className="dark:stroke-[#FF3852]" />
        </g>
        <g>
          <circle cx="70" cy="70" r="36" fill="none" stroke="currentColor" strokeWidth="2.8" />
          <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 55 60 L 70 53 L 85 60 L 79 78 L 61 78 Z" />
            <path d="M 55 60 L 43 56" />
            <path d="M 85 60 L 97 56" />
            <path d="M 61 78 L 52 92" />
            <path d="M 79 78 L 88 92" />
            <path d="M 70 53 L 70 43" />
          </g>
        </g>
      </svg>
    );
  }

  // Variante completa (horizontal)
  return (
    <svg
      viewBox="0 0 560 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Polla Mundialista"
      width={width ?? 280}
      height={height ?? 70}
      className={cn('text-foreground', className)}
    >
      <defs>
        <linearGradient id="trail-green" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1A8754" stopOpacity="0" />
          <stop offset="100%" stopColor="#1A8754" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="trail-blue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E4FD9" stopOpacity="0" />
          <stop offset="100%" stopColor="#1E4FD9" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="trail-red" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D80027" stopOpacity="0" />
          <stop offset="100%" stopColor="#D80027" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="trail-green-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#26C281" stopOpacity="0" />
          <stop offset="100%" stopColor="#26C281" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="trail-blue-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3D7BFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#3D7BFF" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="trail-red-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF3852" stopOpacity="0" />
          <stop offset="100%" stopColor="#FF3852" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Estela tricolor — versión light visible por defecto, dark se ve con Tailwind */}
      <g fill="none" strokeWidth="7" strokeLinecap="round" className="dark:hidden">
        <path d="M 8 44 Q 36 36, 62 50" stroke="url(#trail-green)" />
        <path d="M 6 70 Q 38 64, 64 70" stroke="url(#trail-blue)" />
        <path d="M 8 96 Q 36 92, 62 90" stroke="url(#trail-red)" />
      </g>
      <g fill="none" strokeWidth="7" strokeLinecap="round" className="hidden dark:block">
        <path d="M 8 44 Q 36 36, 62 50" stroke="url(#trail-green-dark)" />
        <path d="M 6 70 Q 38 64, 64 70" stroke="url(#trail-blue-dark)" />
        <path d="M 8 96 Q 36 92, 62 90" stroke="url(#trail-red-dark)" />
      </g>

      {/* Pelota wireframe */}
      <g>
        <circle cx="112" cy="70" r="44" fill="none" stroke="currentColor" strokeWidth="2.8" />
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 93 58 L 112 49 L 131 58 L 124 79 L 100 79 Z" />
          <path d="M 93 58 L 76 55" />
          <path d="M 131 58 L 148 55" />
          <path d="M 100 79 L 88 96" />
          <path d="M 124 79 L 136 96" />
          <path d="M 112 49 L 112 38" />
        </g>
      </g>

      {/* Wordmark */}
      <g transform="translate(184, 0)">
        <text
          x="0"
          y="64"
          fontFamily="var(--font-display)"
          fontWeight="900"
          fontSize="46"
          fill="currentColor"
          letterSpacing="-1.5"
        >
          POLLA
        </text>
        <text
          x="160"
          y="64"
          fontFamily="var(--font-display)"
          fontWeight="900"
          fontSize="46"
          letterSpacing="-1"
        >
          <tspan fill="#1A8754" className="dark:fill-[#26C281]">2</tspan>
          <tspan fill="#1E4FD9" className="dark:fill-[#3D7BFF]">0</tspan>
          <tspan fill="#D80027" className="dark:fill-[#FF3852]">2</tspan>
          <tspan fill="currentColor">6</tspan>
        </text>
        <text
          x="3"
          y="94"
          fontFamily="var(--font-sans)"
          fontWeight="600"
          fontSize="13"
          fill="currentColor"
          opacity="0.55"
          letterSpacing="8"
        >
          MUNDIALISTA
        </text>
      </g>
    </svg>
  );
}
