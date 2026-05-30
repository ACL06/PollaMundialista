# Polla Mundialista — Contexto del proyecto para Claude Code

> Este archivo es leído automáticamente por Claude Code al iniciar en este repositorio.
> Contiene el estado actual, decisiones tomadas y convenciones para que cualquier sesión
> arranque informada sin necesidad de re-explicar el proyecto.

---

## Visión general

**Polla Mundialista** es una aplicación web para hacer pronósticos del Mundial de Fútbol 2026 (USA, México, Canadá) entre amigos. Proyecto personal, no comercial.

**URL producción:** https://polla-mundialista-six.vercel.app
**Repositorio:** https://github.com/ACL06/PollaMundialista

**Fase actual:** Fase 4 (Pronósticos) en curso. Auth, perfil, calendario y tablas de posiciones de grupos ya están en producción. El wizard de pronósticos arrancó: hoy funcionan la bienvenida con countdown y el step de marcadores de fase de grupos con autosave. Faltan bracket, cierre y scoring.

**Disclaimer:** El proyecto NO está afiliado a FIFA. No usar logos, marcas ni mascotas oficiales (ver sección de copyright más abajo).

---

## Estado actual

### ✅ Completado

#### Infraestructura y auth
- Scaffolding inicial Next.js 15 + React 19 + TypeScript
- Login con OTP por correo (`/login` → `/verify`), 3 intentos máx con redirect explícito
- Conexión Supabase (Auth + Postgres + RLS)
- Middleware que protege rutas privadas y refresca sesión
- Three Supabase clients (server, middleware)
- Headers de seguridad en `next.config.mjs` (CSP completa, HSTS, X-Frame-Options, etc.)
- Workflows GitHub Actions (CI lint/typecheck/build + keep-alive Supabase cada 6 días)
- Deploy automático en Vercel funcionando en producción
- Vercel Analytics + Speed Insights activos
- Footer global "By Álvaro Castaño" en todas las vistas
- UserBadge en header con nombre completo + bandera del equipo favorito

#### Perfil (Fase 2 + 2.1)
- Onboarding completo en una sola pantalla: avatar (galería de 6 DiceBear), nombre, apellidos, celular colombiano, nickname único, equipo favorito
- Validación dual: filtros al tipear (celular) + Zod en server action; mensajes inline de error para nombres
- Trigger `on_auth_user_created` crea profile vacío al registrarse; el onboarding lo completa con upsert
- AppLayout exige los 4 campos obligatorios completos antes de dejar entrar a `/home`
- Pestaña "Pronósticos" en TabNav (Inicio · Calendario · Fase de grupos · Pronósticos)

#### Catálogo (Fase 3 + 3B + 3C + 3D)
- Tabla `teams` con los 48 equipos del WC 2026 + sus banderas ISO + grupo (A-L)
- Tabla `matches` con 104 partidos:
  - 72 fase de grupos con equipos definidos + sedes + horarios en TZ Bogotá
  - 32 eliminatorias con `home_team_code`/`away_team_code` nullable y metadata `bracket_source_*` (formato `'1A'`, `'2B'`, `'3ABCDF'`, `'W73'`, `'L101'`)
- Página `/calendar` con 9 filtros (Todos, Hoy, Por jugar, Eliminatorias, Octavos de Final, Cuartos, Semifinales, Tercer Puesto, Final)
- `MatchCard` cambia de color según status: scheduled (neutral), live (rojo + ring), final (desaturado)
- `BracketSlot` muestra "Ganador Grupo A", "Tercer Lugar Grupos C/D/F/G/H", etc. con tooltip en hover
- Página `/grupos` con 12 tablas de posiciones (PJ, G, E, P, GF, GC, DG, Pts) y tie-break FIFA simplificado (puntos → DG → GF → alfabético)
- Helper `compute-standings.ts` puro (cualquier input → standings deterministas)

#### Pronósticos (Fase 4A + 4B.1 + 4B.2)
- Schema BD: 3 tablas (`predictions`, `prediction_group_scores`, `prediction_bracket`) con RLS, triggers de inmutabilidad de `locked_at` y check constraints 0-30 en scores
- Función SQL `predictions_lock_at()` dinámica (lee del match #1, así si la fecha cambia, el lock se sincroniza)
- RLS por usuario: SELECT propio siempre, INSERT/UPDATE/DELETE solo antes del lock global
- Tipos TS: `Prediction`, `PredictionGroupScore`, `PredictionBracketEntry`, `PredictionBracketRound`
- Helpers `predictions-lock.ts`: `getPredictionsLockAt`, `isLockedAt`, `isPredictionsLocked`
- Ruta `/pronosticos` con wizard de 5 steps (Bienvenida, Marcadores, Bracket, Cierre, Revisión)
- Step 1 (Bienvenida) funcional con countdown al lock + estado del pronóstico
- Step 2 (Marcadores) funcional: 72 inputs agrupados por día (12 días), autosave en blur a `prediction_group_scores`, indicador de progreso X/72

#### Cleanup técnico
- AuthShell extraído de los layouts `(auth)` y `(setup)` (eran idénticos)
- 4 bugs preexistentes corregidos:
  - NAME_REGEX permitía "  " (solo espacios) → fix con `pipe()` y trim previo
  - `OnboardingPage` solo verificaba nickname (loop redirect si perfil parcial)
  - `signOutAction` silenciaba errores de cookies en server.ts
  - Filtro "Hoy" de calendar se congelaba cruzando medianoche
- Eliminado código muerto: `supabase/client.ts` no usado, props sin call sites (`size` en TeamLabel/BracketSlot, `dim` en ScoreBlock, `locksIn` en MatchStatusBadge), `useCountdown.reset`, duplicado `NAME_REGEX` en form

### ⏳ Pendiente / Roadmap

- **Fase 4B.3** — Step Bracket (R32 → R16 → QF → SF → Final con dependencias de subset)
- **Fase 4B.4** — Step Cierre (campeón, subcampeón, 3er puesto, marcador final, goleador) + Step Revisión + submit
- **Fase 4C** — Vista read-only del pronóstico tras submit o lock global
- **Fase 4D** — Scoring engine (cálculo de puntos por usuario al actualizar resultados oficiales)
- **Fase 4E** — Indicadores en `/home` (estado del pronóstico, countdown global)
- **Fase 5** — Rankings: vista materializada en Postgres + página `/ranking`
- **Fase 6** — Grupos privados con código de invitación
- **Fase 7** — Notificaciones por email (Resend) + verificar dominio
- **Fase 8** — Panel admin para registrar resultados oficiales
- **Verificar dominio en Resend** para abrir a otros usuarios (hoy solo el email registrado recibe OTP)
- **Dependabot alert #1** (PostCSS XSS) — pendiente

---

## Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | Next.js 15 App Router + React 19 + TypeScript | Server Actions para mutations |
| Estilos | Tailwind CSS 3.4 + componentes propios | CSS variables para temas, paleta tricolor |
| Auth | `@supabase/ssr` con Email OTP | Cookies HttpOnly automáticas |
| Base de datos | Supabase Postgres con RLS | 6 tablas con RLS activo desde día 1 |
| SMTP | Resend (custom SMTP en Supabase) | El default de Supabase es 2 emails/hora — inviable |
| Animaciones | Framer Motion | Solo donde aporta UX |
| Iconos | Lucide React | Outline only |
| Validación | Zod | Schemas en `src/lib/validators/` |
| Avatares | DiceBear v9 (`avataaars`) via `next/image` con `unoptimized` | Sin SDK, URL armada en código |
| Banderas | `flag-icons` 7.x | ISO 3166-1 alpha-2 + 3166-2 (`gb-eng`, `gb-sct`) |
| Fechas | Intl.DateTimeFormat + locale `es-CO` + TZ `America/Bogota` | Sin date-fns |
| Observabilidad | Vercel Analytics + Speed Insights | Web Vitals y page views |
| Hosting | Vercel (Hobby/Free) | Auto-deploy en push a main |
| CI | GitHub Actions | Lint + typecheck + build en PRs |

---

## Modelo de datos

### `profiles`
Columnas: `id` (uuid, FK auth.users), `email`, `nickname` (índice único en `lower()`), `first_name`, `last_name`, `phone`, `favorite_team` (FK teams.code, nullable), `avatar_url`, `created_at`, `updated_at`.
RLS: SELECT/UPDATE/INSERT por usuario propio (`auth.uid() = id`).
Trigger `on_auth_user_created` crea fila vacía al registrarse.

### `teams`
Columnas: `code` (PK), `name`, `flag`, `group_code` (A-L).
48 filas. Lectura pública (RLS abierto en SELECT).

### `matches`
Columnas: `id` (uuid PK), `match_number` (único 1-104), `stage` (`'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'`), `group_code` (nullable), `home_team_code`/`away_team_code` (nullable; FK a teams.code), `bracket_source_home`/`bracket_source_away` (nullable; metadata del bracket en formato `'1A'`/`'W73'`/etc.), `kicks_off_at` (timestamptz), `venue`, `home_score`/`away_score` (nullable), `status`.
104 filas (72 group + 32 eliminatorias). Lectura pública.

### `predictions` (Fase 4)
1 fila por usuario. Columnas: `user_id` (PK + FK auth.users), `locked_at` (inmutable una vez seteado vía trigger), `champion_code`, `runner_up_code`, `third_place_code`, `final_home_score`/`final_away_score` (bonus opcional), `top_scorer` (texto libre), `created_at`, `updated_at`.
RLS: SELECT propio siempre, INSERT/UPDATE solo antes del lock global.

### `prediction_group_scores` (Fase 4)
Hasta 72 filas por usuario. PK compuesta (`user_id`, `match_id`). `home_score`/`away_score` int 0-30.
RLS: igual que predictions.

### `prediction_bracket` (Fase 4)
Hasta 60 filas por usuario. PK compuesta (`user_id`, `round`, `team_code`). `round` ∈ `('r32', 'r16', 'qf', 'sf')`.
Dependencias subset (R16 ⊆ R32, etc.) se validan en server action y UI, no en BD.

### Función SQL `predictions_lock_at()`
Devuelve `kicks_off_at` del match con `match_number = 1`. Las policies RLS de las 3 tablas de predicción la consultan para comparar contra `now()`.

---

## Servicios externos configurados

### Supabase
- Email OTP habilitado, **Confirm email** desactivado
- Templates de email editados (Magic Link, Invite user)
- SMTP custom con Resend
- 6 tablas con RLS activo
- Triggers: `on_auth_user_created` (perfil al signup), `set_updated_at` (genérico), `predictions_locked_at_immutable`
- Región: East US (North Virginia)

### Resend
- Sender actual: `onboarding@resend.dev`
- **Restricción crítica:** sin dominio verificado, solo el email registrado en Resend recibe correos. Para abrir a otros usuarios hay que verificar un dominio.
- Free tier: 3000 emails/mes, 100/día

### Vercel
- Repo: `ACL06/PollaMundialista`
- Branch de producción: `main`
- URL producción: `polla-mundialista-six.vercel.app`
- Preview deployments automáticos en PRs/branches
- Scope: `alvarocastano6-6261s-projects`
- 4 variables de entorno requeridas en los 3 ambientes

---

## Decisiones de arquitectura clave

1. **No usar contraseñas, solo OTP por email.** Reduce fricción y elimina vulnerabilidades de password.
2. **Supabase Auth en vez de Clerk/Auth.js/Firebase.** Único proveedor con OTP nativo + free tier amplio + Postgres incluido.
3. **Server Actions sobre API Routes** para mutations. Idiomático en Next.js 15.
4. **Three Supabase clients** (browser, server, middleware). El de browser se eliminó por no usarse — si se vuelve a necesitar se recrea.
5. **Route groups `(auth)`, `(setup)` y `(app)`** para separar layouts sin afectar URLs.
6. **Trigger en Postgres** (no en código) para sincronizar `auth.users` → `public.profiles`.
7. **`upsert` en lugar de `update`** en saves de perfil como red de seguridad.
8. **Logo inline como SVG** (no via `next/image`) para que `currentColor` herede del tema.
9. **Paleta tricolor** (verde primary, rojo secondary, azul tertiary) evoca a los tres países anfitriones.
10. **Mensajes de error genéricos** en auth para no leakear si un email existe.
11. **Galería de 6 avatares en lugar de selector M/F.** Más inclusivo, mejor UX.
12. **3 intentos máximo de OTP** con redirect forzado a `/login`. Defense in depth contra el rate-limit nativo.
13. **`WORLD_CUP_TEAMS` se mantiene como constante TS** además de la tabla `teams` en BD — sirve para el dropdown del onboarding sin tener que fetchar.
14. **CSP con `vercel.live` permitido** para la toolbar de feedback en previews.
15. **`minmax(0, 1fr)` en grids** que contienen texto largo — el `1fr` default es `minmax(auto, 1fr)` que infla la columna al contenido intrínseco. Aprendido la mala manera en la Fase 3C con los slots del bracket.
16. **Mecánica de polla = Opción C** (Grupos + bracket de clasificados). El usuario predice 72 marcadores + qué equipos pasan a cada ronda eliminatoria + campeón/3er + marcador exacto bonus en la final + goleador.
17. **Lock global = kickoff del match #1**, expresado como función SQL dinámica `predictions_lock_at()` que lee de `matches`. Si la fecha del partido inaugural cambia, el lock se mueve solo.
18. **Submit parcial OK.** Si llega el lock con campos vacíos, esos no suman puntos. No se obliga a "completar todo".
19. **Goleador como texto libre.** Más simple que mantener tabla `players`. La evaluación final será un match flexible (sin acentos, lowercase).
20. **Autosave por sección** del wizard de pronóstico, no por cada keystroke. Save al `onBlur` de los inputs.
21. **Wizard cliente** (no server-driven con rutas por step). Mejor UX, autosave más simple.
22. **Scoring tope 643 puntos**: 360 (grupos) + 64 (R32) + 48 (R16) + 40 (QF) + 32 (SF) + 24 (Final) + 15 (3°) + 30 (campeón) + 15 (final exacta) + 15 (goleador).
23. **`bracket_source_*` como metadata en `matches`** (no en tabla aparte). Texto descriptivo de "de dónde sale" cada slot eliminatorio (`'1A'`, `'2B'`, `'W73'`, `'L101'`). Se mantiene como referencia incluso después de que los equipos reales se conozcan.

---

## Convenciones del código

### Imports
- Alias `@/*` apunta a `src/*` (configurado en `tsconfig.json`).
- Orden: externas → `@/*` → relativas.

### Componentes
- Server Components por defecto. `'use client'` solo cuando hay interactividad/hooks.
- Server Actions en archivos `actions.ts` adyacentes a la ruta que las usa.
- Componentes de UI puros en `src/components/ui/`.
- Componentes por feature en `src/components/<feature>/` (auth, calendar, groups, pronosticos, app, shared).

### Estilos
- Tailwind utility classes con `cn()` helper.
- Colores SIEMPRE via tokens (`bg-primary`, `text-foreground`).
- Dark mode automático vía clase `.dark` en `<html>`.
- `next/image` con `unoptimized` para SVGs externos de DiceBear (no se benefician de la optimización).

### Tipos
- TypeScript estricto. Sin `any`.
- Interfaces de dominio en `src/lib/types/` (match, prediction).
- Validators Zod en `src/lib/validators/`.

### Commits
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- En español, mensaje corto en la primera línea + descripción extendida si aplica.
- **Sin trailer `Co-Authored-By`.**
- HEREDOC para mensajes multilínea.

### Branches
- `main` → producción (protegida).
- `feat/<slug>` → features.
- `fix/<slug>` → bugfixes.
- `chore/<slug>` → mantenimiento.
- `docs/<slug>` → documentación.

---

## Flujo de trabajo (PR → Preview → Merge)

```
1. git checkout -b feat/<nombre>
2. ... cambios ...
3. git commit -m "feat: ..."
4. git push -u origin feat/<nombre>
   └─→ Vercel crea preview automático
5. gh pr create (o desde GitHub web)
6. Validar en preview URL
7. Merge a main (squash)
   └─→ Vercel deploya a producción
8. Borrar branch local + remota
```

Fixes pequeños/urgentes pueden ir directo a `main` (bypass autorizado para el owner).

---

## Comandos del día a día

```bash
# Desarrollo
npm run dev              # arranca en http://localhost:3000
npm run build            # build de producción
npm run typecheck        # validar TypeScript
npm run lint             # ESLint
npm start                # servir el build

# Supabase CLI (cuando se necesite)
supabase login
supabase link --project-ref <ref-id>
supabase gen types typescript --linked > src/types/supabase.ts

# Vercel CLI (cuando se necesite)
vercel env pull .env.local    # bajar env vars desde Vercel
vercel --prod                 # deploy manual a producción

# GitHub CLI (uso frecuente)
gh pr create --title "..." --body "..."
gh pr merge <num> --squash
gh pr checks <num>
```

---

## Restricciones críticas (no negociables)

### Copyright FIFA
**Nunca usar elementos oficiales del Mundial:**
- ❌ Logo "FIFA World Cup 26"
- ❌ Trofeo Copa del Mundo (marca registrada 3D)
- ❌ Palabra "FIFA" en branding del producto
- ❌ Mascota oficial
- ✅ OK: banderas de países, "Polla", "Mundialista", "Mundial 2026" como término genérico, calendario de partidos (datos)
- ✅ Disclaimer en footer del proyecto y emails

### Seguridad
- `SUPABASE_SERVICE_ROLE_KEY` SOLO server-side, nunca con prefijo `NEXT_PUBLIC_`.
- `.env.local` siempre en `.gitignore`.
- RLS activo en todas las tablas desde día 1.
- Headers de seguridad configurados en `next.config.mjs` incluyendo CSP completa.
- Mensajes genéricos para errores de auth.
- Validación Zod en cada Server Action.
- Límite de intentos de OTP (3) con redirect forzado.
- `avatar_url` validado con regex estricta de DiceBear.
- `next.config.mjs` con `dangerouslyAllowSVG: true` mitigado por `contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"` para los SVGs de DiceBear.

### Privacidad
- Aviso de privacidad en footer (Ley 1581 de Colombia aplica).
- No recolectar más datos de los necesarios.

---

## Cuidados específicos del free tier

- **Supabase Free se pausa tras 7 días de inactividad.** Workflow `keep-alive.yml` hace ping cada 6 días.
- **Resend Free:** 100 emails/día, 3000/mes. Suficiente para una polla.
- **Vercel Free:** 100 GB bandwidth/mes.

---

## Deuda técnica conocida

### Pendiente
- **Dependabot alert #1 (PostCSS XSS)** — baja prioridad, en deps dev.
- **Rate limiting server-side:** hoy solo se confía en el rate-limit nativo de Supabase + límite de 3 intentos UI. Si se abre a más usuarios, agregar tabla `rate_limit` en Postgres o Upstash Redis.
- **Tooltips `title` nativos no se disparan en mobile.** Afecta `BracketSlot` y `TeamLabel` truncado. Si molesta, migrar a un tooltip custom (Radix UI o similar).
- **Font preload warnings:** Next.js precarga 3 fuentes pero algunas páginas solo usan 1-2. Cosmético.
- **CSP con `'unsafe-inline'`:** requerido por Next.js sin nonce setup. Aceptable para este scope.
- **`useCountdown` reinicia el interval en cada tick** (drift acumulativo). Funcional, sin bug visible.

### Resueltas (registro histórico)
- ✅ Lista de equipos como constante TS → migrada a tabla `teams` en Fase 3B.
- ✅ NAME_REGEX permitía espacios solo → fix con pipe + trim previo.
- ✅ OnboardingPage redirect loop si perfil parcial → fix con condición completa.
- ✅ signOutAction silenciaba errores de cookies → ahora hay `console.error`.
- ✅ Filtro "Hoy" del calendario se congelaba → ahora se actualiza en `visibilitychange` + heartbeat.
- ✅ Warnings de `<img>` en home y onboarding → migrados a `next/image`.

---

## Documentos relacionados (fuera del repo)

Estos archivos los tiene el dueño del proyecto y NO están en el repo:

- `polla-mundialista-arquitectura.md` — documento completo de arquitectura del MVP, decisiones técnicas, roadmap detallado, copyright FIFA.
- `setup-y-despliegue.md` — guía de setup desde cero (cuentas, servicios, troubleshooting, checklist Go-Live).
- `conex-project-pmacl1991.txt` — credenciales de conexión a Supabase (gitignored).

Si necesitas información que no esté en este `CLAUDE.md` o en el código, pedir al usuario estos documentos.

---

## Estilo de respuesta deseado

- Español colombiano por defecto.
- Tono profesional pero cercano. No corporativo frío.
- Concisión sobre verbosidad — al grano.
- Cuando se haga una decisión técnica, explicar el trade-off brevemente.
- Antes de cambios grandes, mostrar el plan y pedir confirmación.
- Después de implementar, sugerir qué probar para validar.
- Si el usuario cuestiona algo con argumentos, cuestionarlo de vuelta con datos si está equivocado.

---

## Convenciones de trabajo con Claude Code

- Antes de modificar archivos, hacer un `grep` o `view` para no asumir el estado.
- Después de cambios sustanciales, correr `npm run typecheck && npm run lint`.
- Para nuevos componentes, seguir la estructura existente.
- Para nuevas Server Actions, ponerlas en `actions.ts` adyacente a la página que las usa.
- Cuando se necesite SQL contra Supabase, mostrar el SQL primero y pedir que el usuario lo ejecute en SQL Editor (no se tiene acceso directo a la DB desde acá).
- Nunca commitear `.env.local`. Nunca commitear secretos.
- **No incluir `Co-Authored-By` en los mensajes de commit.**
- Para cambios sustanciales, crear branch `feat/<nombre>`, push, esperar preview Vercel, mergear con squash.
- Mantener este `CLAUDE.md` actualizado tras hitos importantes — la deuda técnica también se documenta acá.
