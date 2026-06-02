# Polla Mundialista — Contexto del proyecto para Claude Code

> Este archivo es leído automáticamente por Claude Code al iniciar en este repositorio.
> Contiene el estado actual, decisiones tomadas y convenciones para que cualquier sesión
> arranque informada sin necesidad de re-explicar el proyecto.

---

## Visión general

**Polla Mundialista** es una aplicación web para hacer pronósticos del Mundial de Fútbol 2026 (USA, México, Canadá) entre amigos. Proyecto personal, no comercial.

**URL producción:** https://www.pollafutbolera.com.co (dominio propio; el `polla-mundialista-six.vercel.app` sigue como alias)
**Repositorio:** https://github.com/ACL06/PollaMundialista

**Fase actual:** MVP completo de punta a punta y en uso real. Auth (con dominio propio verificado → OTP funciona para todos), perfil (+ modal de edición), calendario, tablas de grupos, wizard de pronósticos (5 steps, editable hasta el lock global), Comunidad, Ranking, panel admin completo (grupos + eliminatorias + goleador + inscripciones), marcadores de eliminatoria en vivo (Fase 9) e inscripción/premios (Fase 10) están en producción. El sistema "se enciende" cuando el admin carga resultados oficiales. **Notificaciones = solo in-app** (sin emails automáticos, por decisión de costos — ver Fase 7). Pendiente del roadmap: grupos privados (Fase 6).

**Disclaimer:** El proyecto NO está afiliado a FIFA. No usar logos, marcas ni mascotas oficiales (ver sección de copyright más abajo).

---

## Estado actual

### ✅ Completado (en producción)

#### Infraestructura y auth
- Next.js 15 App Router + React 19 + TypeScript estricto
- Login con OTP por correo (`/login` → `/verify`), 3 intentos máx con redirect explícito
- Conexión Supabase (Auth + Postgres + RLS)
- Middleware que protege rutas privadas y refresca sesión
- Supabase clients server + middleware (`@supabase/ssr`)
- Headers de seguridad en `next.config.mjs` (CSP completa, HSTS, X-Frame-Options, etc.)
- Workflows GitHub Actions (CI lint/typecheck/**test**/build + keep-alive Supabase cada 6 días)
- Deploy automático en Vercel; Vercel Analytics + Speed Insights
- Footer global "By Álvaro Castaño"; UserBadge en header (nombre + bandera del equipo favorito)
- **Modal de editar perfil** desde el header (avatar clickeable): edita nombre/apellidos/nickname/celular; el email se muestra pero no se edita (PR #29)

#### Perfil (Fase 2 + 2.1)
- Onboarding en una pantalla: avatar (galería de 6 DiceBear), nombre, apellidos, celular colombiano (10 díg., empieza por 3), nickname único, equipo favorito
- Validación dual: filtros/inline en cliente + Zod en server action; nickname único (índice `lower()`)
- Trigger `handle_new_user` (`on_auth_user_created`) crea profile vacío al registrarse; el onboarding lo completa con upsert
- AppLayout exige nombre/apellidos/celular/nickname completos antes de entrar a `/home`

#### Catálogo (Fase 3 + 3B + 3C + 3D)
- Tabla `teams`: 48 equipos WC 2026 + banderas ISO + grupo (A-L)
- Tabla `matches`: 104 partidos (72 grupos con equipos/sedes/horarios en TZ Bogotá + 32 eliminatorias con equipos nullable y metadata `bracket_source_*`)
- `/calendar`: filtros por fase (Todos, Hoy, Por jugar, Eliminatorias de 32, Octavos, Cuartos, Semis, Tercer lugar, Final). `MatchCard` colorea por status (scheduled/live/final). `BracketSlot` con tooltip en hover
- `/grupos`: 12 tablas de posiciones (PJ, G, E, P, GF, GC, DG, Pts) con tie-break FIFA simplificado. Helper puro `compute-standings.ts`
- **Nomenclatura de rondas:** Fase de grupos → Eliminatorias de 32 (R32) → Octavos de Final → Cuartos de Final → Semifinales → Tercer lugar → Final

#### Pronósticos (Fase 4 completa: 4A–4E)
- Schema: `predictions`, `prediction_group_scores`, `prediction_bracket` con RLS, trigger de inmutabilidad de `locked_at`, check constraints **0-99** en scores
- Función SQL `predictions_lock_at()` (kickoff del match #1) → lock global dinámico
- Wizard cliente `/pronosticos` de 5 steps con state que persiste entre steps:
  1. **Bienvenida** — countdown al lock + estado
  2. **Marcadores** — 72 marcadores por día, autosave en blur, estados de card (guardado/incompleto-ámbar/error), tab del día centrado
  3. **Bracket** — Eliminatorias de 32→Semis, subset + cascada al deseleccionar, **regla 2-3 por grupo** en R32, agrupado por grupo
  4. **Cierre** — campeón/subcampeón/tercer lugar (entre los 4 semifinalistas), marcador exacto de la final (bonus), goleador (texto libre)
  5. **Revisión** — resumen + submit que setea `locked_at` (marca "enviado"; sigue editable hasta el lock global)
- Autosave por server action; `editBlockReason()` bloquea edición tras submit propio o lock global
- **Vista read-only** (`PredictionView`, Fase 4C): cuando enviaste o cerró el plazo, en vez del wizard se muestra el pronóstico completo (reusada también en Comunidad)
- **Indicadores en /home** (Fase 4E, `PredictionStatusCard`): countdown + progreso (X/137) + CTA según estado
- **Pestaña Eliminatorias** (Fase 9B+9C, `PronosticosTabs` + `KnockoutScoresPanel`): `/pronosticos` tiene 2 tabs — *Mi pronóstico* (wizard/read-only) y *Eliminatorias* (marcadores de R32..3er lugar). Cada partido: `pending` (cruce tipo calendario) → `open` (inputs + autosave vía `saveKnockoutScore`) → `closed` (read-only) según `knockoutMatchState()`. Puntúan 5/2 en el scoring y ranking (9C)

#### Scoring (Fase 4D + 9C)
- Motor TS puro `src/lib/scoring.ts` con **tests Vitest** (`scoring.test.ts`, 39 tests):
  - `computeScore(user, official)` → desglose + total (máx **798**)
  - `deriveOfficialResults(matches, topScorer)` → construye resultados oficiales desde `matches` (incl. `knockoutScores`)
  - `buildRanking(predictions, groupScores, bracket, knockoutScores, official)` → agrupa por usuario, ordena
  - `normalizeScorer` → match flexible del goleador (sin acentos/mayúsculas)
- Reglas: grupos exacto 5 / solo-resultado 2; **eliminatoria (R32..3er lugar) exacto 5 / solo-resultado 2 al 90' (Fase 9C)**; clasificados R32 2, R16 3, QF 5, SF 8 por equipo; finalistas 12 c/u; tercer lugar 15; campeón 30; marcador final 15 (**estricto, por equipo**: suma solo si tu campeón y tu subcampeón jugaron la final y le clavaste a cada uno su marcador exacto; empate a 90' cuenta si predijiste ese empate entre esos dos equipos); goleador 15

#### Ranking (Fase 5)
- `/ranking`: gate pre-lock; post-lock arma el ranking server-side reusando `buildRanking` + resultados de `matches` + goleador de `tournament_settings`
- Podio top-3 + tabla con posición (ranking de competición), avatar, nombre, exactos, total; resalta tu fila
- Cómputo en TS (no materialized view) — una sola fuente de verdad con el scoring

#### Comunidad (Fase 4F — transparencia post-lock)
- `/comunidad`: gate pre-lock; post-lock muestra los pronósticos de **todos** por día/partido (identificados por nombre y apellidos + avatar)
- Módulos: **El campeón de la polla** (distribución), **Consenso por partido** (% 1X2 + marcador más repetido), **Rebeldes** ("🔥 va solo" cuando van contra un favorito ≥60%), **Reacciones emoji** (👍 😂 🔥 😱) sobre cada pronóstico
- `/comunidad/[userId]`: pronóstico completo de cualquiera (reusa `PredictionView`)
- Vista `public_profiles` (solo columnas no sensibles) para mostrar nombres/avatares sin exponer phone/email

#### Panel admin (Fase 8.1 + 8.2 + 10A)
- `/admin`: gated por flag `is_admin` (server-side + en cada action via `requireAdmin()` + RLS). Link "Panel admin" en /home solo para admins.
- Switcher **Fase de grupos / Eliminatorias / Inscripciones**.
  - Grupos: marcador + status de los 72 partidos (autosave) + goleador oficial (`tournament_settings`).
  - Eliminatorias (`KnockoutResultsEditor`): por ronda, asignar equipos home/away (de los 48, con hint del `bracket_source`) + marcador + status.
  - Inscripciones (`EnrollmentEditor`, Fase 10A): lista de usuarios (de `public_profiles`) con toggle pre-inscrito/inscrito (`setEnrollment` → `profiles.is_enrolled`).
- Patrón de guardado: `changeAndPersist(id, patch)` calcula el draft nuevo y lo persiste directo (evita el stale-closure de setState+leer-viejo que tuvo un bug en 8.2, ya corregido).
- Esto "enciende" scoring, ranking, tablas de grupos y aciertos en Comunidad.

#### Inscripción y premios (Fase 10)
- **10A** — `profiles.is_enrolled` + admin (ver Panel admin).
- **10B** — Sección **Inscripción y premios** en `/home` (entre Reglas y Explora, `EnrollmentPrizes`): estado pre-inscrito/inscrito, costo (`ENROLLMENT_COST_COP` = $50.000, configurable), contador de inscritos (de `public_profiles`), **monto acumulado** que **se revela en el partido inaugural** (gate `isLockedAt`), reparto **10% administración + podio 70/20/10** (`src/lib/prizes.ts` `computePrizes` con `ADMIN_CUT`, con tests), regla de **empates** (movida desde `game-rules.ts`), sección **"Cómo pagar"** (llave Bre-B `BREB_KEY`/`BREB_HOLDER`) y botón al **grupo de WhatsApp** (`WHATSAPP_GROUP_URL`, placeholder). Podio gráfico con datos de ejemplo.
- **Badge de estado** bajo el saludo en `/home` (`EnrollmentBadge`): rojo = pre-inscrito, verde = inscrito.
- **10C — Acceso de pre-inscritos** (todo app-layer, sin SQL):
  - **Gate** en `AppLayout`: al pasar el lock global, un usuario con `!is_enrolled && !is_admin` ve `NotEnrolledScreen` (sin acceso a las rutas privadas).
  - **Filtrado** post-lock: `loadRanking` (ranking + "Tu posición") y Comunidad (lista, consenso, distribución, detalle `[userId]`) **solo muestran inscritos** — los pre-inscritos desaparecen.
  - **Recordatorio** (`EnrollmentReminderModal`): pre-inscritos ven 1×/día (localStorage) en los últimos 5 días antes del arranque un modal con la llave Bre-B + WhatsApp.

#### Tests (Vitest)
- `scoring.test.ts` (39): reglas de scoring (incl. marcadores de eliminatoria y marcador de la final estricto por equipo), deriveOfficialResults, buildRanking, pronóstico perfecto = 798.
- `knockout-window.test.ts` (7): estados de la ventana de captura por partido (pending/open/closed).
- `prizes.test.ts` (5): reparto de premios (10% admin + podio 70/20/10, el 1° absorbe el redondeo).
- `compute-standings.test.ts`, `format-bracket-source.test.ts`, `predictions-lock.test.ts`, `validators/profile.test.ts`, `validators/prediction.test.ts`.
- **77 tests en total**, corren en CI (`npm test`).

### ⏳ Pendiente / Roadmap

- **Fase 6** — Grupos privados con código de invitación
- ✅ **Fase 7 (cerrada)** — Dominio propio `pollafutbolera.com.co` registrado en Hostinger y **verificado en Resend** → el OTP llega a cualquier correo (probado con usuarios reales). **Decisión: notificaciones solo in-app** (la tarjeta de estado en `/home` con countdown + CTA hace de recordatorio) — sin emails automáticos, para no pasar el free tier de Resend (100/día, 3.000/mes). Si algún día se quisieran, retomar el plan 7A/7B con dedup + tope diario.
- **Comunidad: aciertos del día / tabla en vivo** cuando haya resultados (mejora social)
- **Modal de perfil**: opción de cambiar avatar y equipo favorito (hoy solo los 4 campos base)
- **Refactors DRY pendientes** (maintainability, no bugs): helper de query de `matches` (7 pages comparten select+normalize), `sanitizeScore`/`sanitizePhone` a `utils`, componente `ScoreInput` unificado
- **Regla: marcadores al minuto 90** (sin prórroga ni penaltis) — confirmado con el usuario. El marcador exacto se evalúa al 90'. Implicación: si la final/tercer lugar empatan en 90' (se definen por penales), `pickWinner` no otorga campeón/tercer lugar. Es por diseño (no se modelan penales); si se quisiera otorgar, haría falta una columna `winner_code`. Las reglas visibles al usuario están en `src/lib/game-rules.ts`
- **Dependabot alert #1** (PostCSS XSS) — baja prioridad, dev deps

---

## Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | Next.js 15 App Router + React 19 + TypeScript | Server Actions para mutations |
| Estilos | Tailwind CSS 3.4 + componentes propios | CSS variables, paleta tricolor |
| Auth | `@supabase/ssr` con Email OTP | Cookies HttpOnly |
| Base de datos | Supabase Postgres con RLS | 8 tablas + 1 vista, RLS activo |
| SMTP | Resend (custom SMTP en Supabase), dominio `pollafutbolera.com.co` verificado | Free: 100/día, 3000/mes |
| Animaciones | Framer Motion | Modales, transiciones |
| Iconos | Lucide React | Outline |
| Validación | Zod | `src/lib/validators/` |
| **Tests** | **Vitest** | `npm test`; tests del scoring en `scoring.test.ts`; corre en CI |
| Avatares | DiceBear v9 (`avataaars`) via `next/image` `unoptimized` | |
| Banderas | `flag-icons` 7.x | ISO 3166-1/2 (`gb-eng`, `gb-sct`) |
| Fechas | Intl.DateTimeFormat, locale `es-CO`, TZ `America/Bogota` | Sin date-fns |
| Hosting / CI | Vercel + GitHub Actions | Auto-deploy en push a main |

---

## Modelo de datos

### Tablas
- **`profiles`** — `id` (FK auth.users), `email`, `nickname` (único `lower()`), `first_name`, `last_name`, `phone`, `favorite_team` (FK teams), `avatar_url`, **`is_admin`** (bool), **`is_enrolled`** (bool, default `false` = pre-inscrito; lo administra el admin tras pago externo — Fase 10), timestamps. RLS: SELECT/UPDATE/INSERT propios + **UPDATE de admin** (`is_admin()`) para administrar inscripción.
- **`teams`** — `code` (PK), `name`, `flag`, `group_code` (A-L). 48 filas, lectura pública.
- **`matches`** — `id`, `match_number` (1-104), `stage` (`group|r32|r16|qf|sf|3rd|final`), `group_code`, `home_team_code`/`away_team_code` (nullable), `bracket_source_home`/`away`, `kicks_off_at`, `venue`, `home_score`/`away_score`, `status`. Lectura pública; UPDATE solo admin (RLS `is_admin()`).
- **`predictions`** — 1 fila/usuario. `user_id` (PK), `locked_at` (inmutable), `champion_code`, `runner_up_code`, `third_place_code`, `final_home_score`/`away_score`, `top_scorer`, timestamps.
- **`prediction_group_scores`** — PK (`user_id`, `match_id`), scores 0-99.
- **`prediction_bracket`** — PK (`user_id`, `round`, `team_code`), `round` ∈ (`r32`,`r16`,`qf`,`sf`).
- **`prediction_knockout_scores`** — PK (`user_id`, `match_id`), scores 0-99, `updated_at`. Marcadores de eliminatoria (R32..3er lugar; la final no). Ventana **por partido** (no por el lock global): editable mientras el cruce tiene equipos y no arranca (Fase 9).
- **`prediction_reactions`** — PK (`reactor_id`, `target_user_id`, `match_id`), `reaction` ∈ (`like`,`laugh`,`fire`,`shock`), `check (reactor_id <> target_user_id)`.
- **`tournament_settings`** — 1 fila (`id=1`), `top_scorer`. Lectura pública, UPDATE solo admin.

### Vista
- **`public_profiles`** — `select id, nickname, first_name, last_name, avatar_url, favorite_team, is_enrolled from profiles`. SECURITY DEFINER (expone solo columnas no sensibles a `authenticated`; **nunca** phone/email). Permite contar inscritos y que el admin liste usuarios sin abrir SELECT global en `profiles`. El advisor lo marca pero es intencional/seguro (acknowledged).

### RLS — patrón de pronósticos
- Las 3 tablas de predicción + reactions: **SELECT propio siempre + SELECT público post-lock** (`now() >= predictions_lock_at()`). INSERT/UPDATE/DELETE propio y solo antes del lock (predicciones) o post-lock (reacciones).

### Funciones SQL
- `predictions_lock_at()` — `kicks_off_at` del match #1 (lock global dinámico).
- `is_admin()` — security definer, lee `profiles.is_admin` de `auth.uid()`.
- `knockout_match_editable(match_id)` / `knockout_match_started(match_id)` — security definer; lock **por partido** de los marcadores de eliminatoria (editable = stage R32..3er + ambos equipos + `now() < kickoff`; started = `now() >= kickoff`, abre lectura pública).
- `handle_new_user`, `set_updated_at`, `predictions_locked_at_immutable` — triggers.
- **Todas con `search_path` fijo** (hardening del Security Advisor).

---

## Decisiones de arquitectura clave

1. **Solo OTP por email** (sin contraseñas). Login passwordless.
2. **Supabase Auth + Postgres + RLS** desde día 1.
3. **Server Actions** para mutations; Server Components por defecto.
4. **Route groups** `(auth)`, `(setup)`, `(app)`.
5. **Trigger en Postgres** para `auth.users` → `profiles`. `upsert` como red de seguridad en saves.
6. **Paleta tricolor** (verde/rojo/azul) por los 3 anfitriones. Mensajes de error genéricos en auth.
7. **`minmax(0, 1fr)` en grids** con texto largo (evita inflado por contenido intrínseco).
8. **Mecánica = Opción C** (grupos + bracket de clasificados). El usuario predice 72 marcadores + qué equipos pasan a cada ronda + campeón/subcampeón/tercer lugar + marcador exacto final (bonus) + goleador.
9. **Lock global = kickoff match #1** vía `predictions_lock_at()`. **Submit marca "enviado"** (`locked_at`) pero **editable hasta el lock global** (ya no es inmutable; el `editBlockReason` solo bloquea por el lock global, `submitPrediction` es idempotente, y `/pronosticos` muestra el wizard editable mientras `!isLocked`). Submit parcial OK (campos vacíos = 0).
10. **Wizard cliente** con state que vive en `PredictionWizard` (persiste al navegar entre steps). Autosave por sección (onBlur / toggle).
11. **Goleador texto libre**, match flexible al evaluar. **Marcador de la final = estricto, por equipo**: el usuario asigna goles a su campeón (`final_home_score`) y a su subcampeón (`final_away_score`); suma 15 solo si **ambos finalistas predichos jugaron la final** y los goles que les asignó coinciden con los goles reales de **ese mismo equipo** (vía `finalHomeCode`/`finalAwayCode` en `OfficialResults`, independiente de home/away oficial; un empate a 90' definido por penales cuenta si se predijo ese empate entre esos dos equipos). Acertar los equipos se premia aparte (campeón 30, finalistas 12).
12. **Regla 2-3 por grupo en Eliminatorias de 32** (cada grupo aporta 2 directos + posible mejor tercero = 8 grupos con 3).
13. **Scoring en TS, no en SQL** (`scoring.ts` + Vitest). El **ranking** también computa en TS server-side — una sola fuente de verdad. Con ~30 usuarios el costo es trivial.
14. **Transparencia post-lock**: los pronósticos de todos se abren al lock (nadie copia antes). Vista `public_profiles` para nombres sin exponer datos sensibles.
15. **Admin vía flag `is_admin`** + función `is_admin()` en RLS (no hardcodear email).
16. **Tests del scoring con Vitest** — las reglas son muchas y un bug afecta a toda la polla.

---

## Convenciones del código

### Estructura
- Alias `@/*` → `src/*`. Orden de imports: externas → `@/*` → relativas.
- Componentes de feature en `src/components/<feature>/` (auth, calendar, groups, pronosticos, app, home, shared, theme). UI puros en `src/components/ui/`.
- Server Actions en `actions.ts` adyacente a la ruta. Helpers de dominio en `src/lib/`, tipos en `src/lib/types/`, validators Zod en `src/lib/validators/`.
- ⚠️ **No importar valores (no-tipos) desde un `page.tsx` server hacia un componente cliente** — arrastra `next/headers` al bundle. Usar un módulo `shared.ts` neutro (ver `comunidad/shared.ts`).

### Estilos
- Tailwind + `cn()`. Colores SIEMPRE via tokens (`bg-primary`, `text-foreground`). Dark mode automático.
- `next/image` con `unoptimized` para SVGs de DiceBear.

### Commits y branches
- Conventional Commits en español (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`). HEREDOC para multilínea.
- **Sin trailer `Co-Authored-By`.**
- `main` (protegida) ← `feat/`/`fix/`/`chore/`/`docs/<slug>` → push → preview Vercel → PR → squash merge.

### ⚠️ Lección aprendida (proceso)
- **No mergear un PR mientras se siguen pusheando commits a su branch.** GitHub mergea el estado del branch en ese instante; pushes posteriores quedan fuera. Pasó con #18 y #24 (se recuperaron con cherry-pick). Regla: esperar el preview + refrescar la página del PR antes de mergear.

---

## Comandos del día a día

```bash
npm run dev          # http://localhost:3000
npm run build        # build de producción
npm run typecheck    # TypeScript sin emitir
npm run lint         # ESLint
npm test             # Vitest (scoring)
npm run test:watch   # Vitest watch

# GitHub CLI
gh pr create --title "..." --body "..."
gh pr merge <num> --squash
```

Cuando se necesite SQL contra Supabase: mostrar el SQL y pedir que el usuario lo ejecute en el SQL Editor (no hay acceso directo a la DB desde acá). El usuario corre el SQL **antes** de mergear el PR que lo necesita.

---

## Restricciones críticas (no negociables)

### Copyright FIFA
**Nunca:** logo "FIFA World Cup 26", trofeo, palabra "FIFA" en branding, mascota oficial.
**OK:** banderas de países, "Polla", "Mundialista", "Mundial 2026" como término genérico, calendario (datos), disclaimer en footer.

### Seguridad / Privacidad
- `SUPABASE_SERVICE_ROLE_KEY` SOLO server-side, nunca `NEXT_PUBLIC_`. `.env.local` en `.gitignore`.
- RLS activo en todas las tablas. Validación Zod en cada Server Action. Funciones SQL con `search_path` fijo.
- `public_profiles` expone solo columnas no sensibles (nunca phone/email).
- Aviso de privacidad en footer (Ley 1581 de Colombia). No recolectar más datos de los necesarios.

---

## Cuidados del free tier
- **Supabase** se pausa tras 7 días de inactividad → workflow `keep-alive.yml` cada 6 días.
- **Resend** 100/día, 3000/mes. **Vercel** 100 GB/mes.

---

## Deuda técnica conocida
- **Dependabot #1 (PostCSS XSS)** — baja prioridad, dev deps.
- **Rate limiting server-side**: hoy solo rate-limit nativo de Supabase + límite UI de 3 intentos. Si se abre a más usuarios, agregar tabla `rate_limit` o Upstash.
- **Tooltips `title` nativos** no se disparan en mobile (`BracketSlot`, `TeamLabel`). Migrar a tooltip custom si molesta.
- **Reacciones sin tiempo real** — aparecen al recargar (suficiente para una polla; Supabase Realtime se puede enchufar después).
- **CSP con `'unsafe-inline'`** — requerido por Next.js sin nonce. Aceptable.
- **Security Advisor**: el warning de `public_profiles` (Security Definer View) es intencional/aceptado; "Leaked Password Protection" no aplica (OTP, sin contraseñas).

### Resueltas (registro histórico)
- ✅ Lista de equipos TS → tabla `teams` (3B). NAME_REGEX espacios-solo → pipe+trim. OnboardingPage loop redirect. signOutAction silenciaba cookies. Filtro "Hoy" congelado. Warnings `<img>` → `next/image`. Nomenclatura "Treintaidosavos" → "Dieciseisavos de Final" → "Eliminatorias de 32"; "Tercer Puesto" → "Tercer lugar". Funciones sin `search_path` → hardened.

---

## Documentos relacionados (fuera del repo)
- `polla-mundialista-arquitectura.md` — arquitectura del MVP, decisiones, roadmap, copyright FIFA.
- `setup-y-despliegue.md` — setup desde cero, troubleshooting, checklist Go-Live.
- `conex-project-pmacl1991.txt` — credenciales Supabase (gitignored).

Si falta info que no esté acá ni en el código, pedir estos documentos al usuario.

---

## Estilo de respuesta deseado
- Español colombiano, profesional pero cercano, conciso.
- Explicar trade-offs brevemente. Antes de cambios grandes, mostrar el plan y pedir confirmación.
- Después de implementar, sugerir qué probar. Si el usuario se equivoca con argumentos, cuestionarlo con datos.

---

## Convenciones de trabajo con Claude Code
- Antes de modificar, `grep`/`read` para no asumir el estado.
- Tras cambios sustanciales: `npm run typecheck && npm run lint && npm test`.
- Server Actions en `actions.ts` adyacente. Componentes nuevos siguiendo la estructura existente.
- SQL: mostrarlo primero, el usuario lo ejecuta en Supabase (correr antes de mergear).
- Nunca commitear `.env.local` ni secretos. **Sin `Co-Authored-By`.**
- Para cambios sustanciales: branch → push → preview → PR → squash. **Esperar preview antes de mergear.**
- Mantener este `CLAUDE.md` al día tras hitos importantes.
