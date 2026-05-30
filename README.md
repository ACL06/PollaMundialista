# Polla Mundialista

Aplicación web para hacer pronósticos del **Mundial de Fútbol 2026** (USA · México · Canadá) entre amigos. Proyecto personal, no comercial.

🔗 **Producción:** https://polla-mundialista-six.vercel.app
🛠️ **Stack:** Next.js 15 · React 19 · TypeScript · Supabase · Tailwind · Vercel

> Polla Mundialista es un proyecto independiente y no está afiliado, patrocinado ni avalado por FIFA ni por ninguna federación oficial.

---

## Features implementadas

| Módulo | Descripción |
|---|---|
| **Auth** | Login sin contraseña vía OTP de 6 dígitos por correo (Supabase Auth + Resend). 3 intentos máximos por sesión. |
| **Perfil** | Onboarding obligatorio con nombre, apellidos, celular colombiano, nickname único, avatar (galería de 6 SVG de DiceBear) y equipo favorito (48 selecciones WC 2026). |
| **Calendario** | Los 104 partidos del torneo (72 fase de grupos + 32 eliminatorias) con filtros por fase, día y status. Cards con color según estado (programado / en vivo / final). |
| **Fase de grupos** | Tablas de posiciones por grupo con cálculo automático (PJ, G, E, P, GF, GC, DG, Pts) y tie-break FIFA. |
| **Pronósticos** *(en curso)* | Wizard de 5 pasos para predecir grupos + bracket + cierre, con lock global al arranque del partido inaugural. Hoy funcionales: bienvenida con countdown y marcadores de fase de grupos con autosave. |
| **Tema** | Claro / oscuro con persistencia. Paleta tricolor (verde · rojo · azul) que evoca a los tres países anfitriones. |
| **Seguridad** | Cookies HttpOnly, RLS activo en todas las tablas, CSP completa, validación Zod en cada Server Action, headers de seguridad estándar (X-Frame-Options, HSTS, etc.). |

---

## Stack técnico

- **Next.js 15** (App Router) + React 19 + TypeScript estricto
- **Tailwind CSS 3.4** + componentes propios (Button, Input, etc.)
- **Supabase** Auth + Postgres + RLS + storage de cookies HttpOnly
- **`@supabase/ssr`** (clientes server/middleware separados)
- **Resend** como SMTP custom (free tier: 3000 emails/mes)
- **Framer Motion** para animaciones (solo donde aporta UX)
- **Lucide React** para íconos (outline only)
- **Zod** para validación de schemas
- **DiceBear v9** (`avataaars`) para avatares vía URL
- **flag-icons** para banderas ISO 3166-1/2
- **Vercel** para hosting + CI/CD (auto-deploy en push a main)
- **GitHub Actions** para lint/typecheck/build en PRs + keep-alive de Supabase

---

## Estructura del repo

```
src/
├── app/
│   ├── layout.tsx                # Root: ThemeProvider, fonts, Footer global
│   ├── page.tsx                  # Redirige según sesión
│   ├── globals.css
│   ├── (auth)/                   # Layouts AuthShell + login/verify
│   ├── (setup)/                  # Onboarding (perfil obligatorio)
│   └── (app)/                    # Rutas autenticadas con TabNav
│       ├── home/                 # Tarjeta de bienvenida
│       ├── calendar/             # 104 partidos con filtros
│       ├── grupos/               # 12 tablas de posiciones
│       └── pronosticos/          # Wizard de pronóstico (en curso)
│           ├── steps/            # WelcomeStep, GroupScoresStep, …
│           ├── PredictionWizard.tsx
│           ├── WizardNav.tsx
│           ├── page.tsx          # Server: fetch del estado
│           └── actions.ts        # Server actions: saveGroupScore, …
├── components/
│   ├── ui/                       # Button, Input
│   ├── theme/                    # ThemeProvider, ThemeToggle
│   ├── shared/                   # Logo, Footer, AuthShell
│   ├── auth/                     # EmailForm, OtpInput, ResendButton
│   ├── app/                      # TabNav, UserBadge
│   ├── calendar/                 # MatchCard, TeamLabel, BracketSlot, …
│   ├── groups/                   # GroupTable
│   └── pronosticos/              # Countdown
├── lib/
│   ├── supabase/                 # server, middleware
│   ├── validators/               # Schemas Zod (profile, prediction)
│   ├── types/                    # match, prediction
│   ├── compute-standings.ts      # Tabla de posiciones
│   ├── format-date.ts            # Locale es-CO, TZ Bogotá
│   ├── format-bracket-source.ts  # "1A" → "Ganador Grupo A"
│   ├── predictions-lock.ts       # Helper del lock global
│   ├── avatar.ts                 # URL builder de DiceBear
│   └── utils.ts                  # cn() y helpers
├── hooks/                        # useCountdown
└── middleware.ts                 # Protege rutas + refresca sesión
```

---

## Base de datos

| Tabla | Filas | Uso |
|---|---|---|
| `profiles` | 1 por usuario | Datos personales + nickname + avatar + equipo favorito |
| `teams` | 48 | Catálogo del WC 2026 (código + nombre + flag + group_code) |
| `matches` | 104 | 72 fase de grupos + 32 eliminatorias (con `bracket_source_*` para slots pendientes) |
| `predictions` | 1 por usuario | Pronóstico principal: campeón, finalista, 3er, marcador final, goleador |
| `prediction_group_scores` | hasta 72 por usuario | Marcadores predichos de fase de grupos |
| `prediction_bracket` | hasta 60 por usuario | Equipos predichos como clasificados a cada ronda eliminatoria |

Todas con **RLS activo** desde el día 1.

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con credenciales de Supabase

# 3. Arrancar
npm run dev    # http://localhost:3000
```

### Variables requeridas

| Variable | ¿Pública? | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Anon key (RLS la protege) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Solo server-side. Bypasea RLS |
| `NEXT_PUBLIC_SITE_URL` | Sí | URL base por ambiente |

Se configuran en **Vercel → Project Settings → Environment Variables** para los 3 ambientes (Production, Preview, Development).

---

## Scripts disponibles

```bash
npm run dev         # Servidor de desarrollo (puerto 3000)
npm run build       # Build de producción
npm start           # Servir el build
npm run lint        # ESLint
npm run typecheck   # TypeScript sin emitir
```

---

## Flujo de trabajo

```
feat/<slug>  →  push  →  preview Vercel  →  validar  →  squash merge a main  →  prod
```

- `main` → producción (protegida).
- `feat/<slug>` → features.
- `fix/<slug>` → bugfixes.
- `chore/<slug>` → mantenimiento.
- `docs/<slug>` → documentación.

Fixes pequeños y urgentes pueden ir directo a main (bypass autorizado para el owner).

---

## Documentos relacionados

- **`CLAUDE.md`** — Contexto extendido para Claude Code (estado, decisiones, deuda técnica, convenciones).
- `polla-mundialista-arquitectura.md` *(fuera del repo)* — Diseño detallado del MVP.
- `setup-y-despliegue.md` *(fuera del repo)* — Setup desde cero + troubleshooting.
