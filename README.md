# Polla Mundialista

Aplicación web para hacer pronósticos del **Mundial de Fútbol 2026** (USA · México · Canadá) entre amigos. Proyecto personal, no comercial.

🔗 **Producción:** https://www.pollafutbolera.com.co
🛠️ **Stack:** Next.js 15 · React 19 · TypeScript · Supabase · Tailwind · Vercel

> Polla Mundialista es un proyecto independiente y no está afiliado, patrocinado ni avalado por FIFA ni por ninguna federación oficial.

---

## Features

| Módulo | Descripción |
|---|---|
| **Auth** | Login sin contraseña vía OTP de 6 dígitos por correo (Supabase Auth + Resend). 3 intentos máximos. |
| **Perfil** | Onboarding obligatorio (nombre, apellidos, celular colombiano, nickname único, avatar DiceBear, equipo favorito) + modal de edición desde el header. |
| **Calendario** | Los 104 partidos del torneo con filtros por fase/día/status. Cards con color según estado (programado / en vivo / final). |
| **Fase de grupos** | 12 tablas de posiciones con cálculo automático (PJ, G, E, P, GF, GC, DG, Pts) y tie-break FIFA. |
| **Pronósticos** | Wizard de 5 pasos: marcadores de grupos + bracket de clasificados (con regla 2-3 por grupo) + campeón/podio/goleador. Autosave, lock global al partido inaugural, envío one-shot. Vista read-only tras el cierre. |
| **Scoring** | Motor de puntos puro y testeado (Vitest). Máx 643 pts. |
| **Ranking** | Tabla de posiciones de la polla por puntos, con podio. Se activa post-lock. |
| **Comunidad** | Tras el cierre, los pronósticos de todos se vuelven públicos: comparación por partido, distribución de campeones, consenso, "rebeldes" y reacciones emoji. |
| **Panel admin** | Carga de resultados oficiales (marcadores + status + goleador) que alimenta scoring, ranking y tablas. Gated por flag `is_admin`. |
| **Tema** | Claro / oscuro. Paleta tricolor (verde · rojo · azul) por los tres anfitriones. |
| **Seguridad** | Cookies HttpOnly, RLS en todas las tablas, CSP completa, validación Zod en cada Server Action, funciones SQL con `search_path` fijo. |

---

## Stack técnico

- **Next.js 15** (App Router) + React 19 + TypeScript estricto
- **Tailwind CSS 3.4** + componentes propios
- **Supabase** Auth + Postgres + RLS (`@supabase/ssr`)
- **Resend** como SMTP custom
- **Framer Motion** (animaciones, modales), **Lucide React** (íconos), **Zod** (validación)
- **Vitest** para tests del motor de scoring
- **DiceBear v9** (avatares), **flag-icons** (banderas ISO)
- **Vercel** (hosting + CI/CD) + **GitHub Actions** (lint/typecheck/test/build)

---

## Estructura del repo

```
src/
├── app/
│   ├── layout.tsx                # Root: ThemeProvider, fonts, Footer global
│   ├── (auth)/                   # login / verify (AuthShell)
│   ├── (setup)/                  # onboarding (perfil obligatorio)
│   └── (app)/                    # rutas autenticadas con TabNav
│       ├── home/                 # bienvenida + estado del pronóstico
│       ├── calendar/             # 104 partidos con filtros
│       ├── grupos/               # 12 tablas de posiciones
│       ├── pronosticos/          # wizard + vista read-only
│       │   └── steps/            # Welcome, GroupScores, Bracket, Closing, Review
│       ├── comunidad/            # pronósticos de todos + reacciones
│       ├── ranking/              # tabla de posiciones de la polla
│       └── admin/                # carga de resultados (solo admins)
├── components/                   # ui, theme, shared, auth, app, calendar, groups, pronosticos, home
├── lib/
│   ├── supabase/                 # server, middleware
│   ├── validators/               # schemas Zod
│   ├── types/                    # match, prediction
│   ├── scoring.ts (+ .test.ts)   # motor de puntos + tests
│   ├── compute-standings.ts      # tablas de grupos
│   ├── predictions-lock.ts       # lock global
│   └── ...                       # format-date, format-bracket-source, avatar, utils
├── hooks/                        # useCountdown
└── middleware.ts                 # protege rutas + refresca sesión
```

---

## Base de datos

| Tabla / vista | Uso |
|---|---|
| `profiles` | Datos del usuario + `is_admin` |
| `teams` | Catálogo WC 2026 (48 equipos) |
| `matches` | 104 partidos (72 grupos + 32 eliminatorias) |
| `predictions` | Pronóstico principal (campeón, podio, marcador final, goleador) |
| `prediction_group_scores` | Marcadores predichos de grupos |
| `prediction_bracket` | Equipos predichos por ronda eliminatoria |
| `prediction_reactions` | Reacciones emoji a pronósticos (post-lock) |
| `tournament_settings` | Ajustes del torneo (goleador oficial) |
| `public_profiles` (vista) | Columnas no sensibles de profiles para Comunidad/Ranking |

**RLS activo en todas las tablas.** Las predicciones son privadas hasta el lock global; públicas después.

---

## Setup local

```bash
npm install
cp .env.example .env.local   # completar credenciales de Supabase
npm run dev                  # http://localhost:3000
```

### Variables requeridas

| Variable | ¿Pública? | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Anon key (RLS la protege) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Solo server-side |
| `NEXT_PUBLIC_SITE_URL` | Sí | URL base por ambiente |

Se configuran en **Vercel → Project Settings → Environment Variables** (Production, Preview, Development).

---

## Scripts

```bash
npm run dev          # desarrollo
npm run build        # build de producción
npm start            # servir el build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # Vitest
npm run test:watch   # Vitest watch
```

---

## Flujo de trabajo

```
feat/<slug>  →  push  →  preview Vercel  →  validar  →  squash merge a main  →  prod
```

`main` (protegida); ramas `feat/` · `fix/` · `chore/` · `docs/`.

---

## Documentos relacionados

- **`CLAUDE.md`** — Contexto extendido (estado, decisiones, modelo de datos, deuda técnica, convenciones).
- `polla-mundialista-arquitectura.md` *(fuera del repo)* — diseño del MVP.
- `setup-y-despliegue.md` *(fuera del repo)* — setup desde cero + troubleshooting.
