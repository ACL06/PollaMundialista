# Polla Mundialista — Contexto del proyecto para Claude Code

> Este archivo es leído automáticamente por Claude Code al iniciar en este repositorio.
> Contiene el estado actual, decisiones tomadas y convenciones para que cualquier sesión
> arranque informada sin necesidad de re-explicar el proyecto.

---

## Visión general

**Polla Mundialista** es una aplicación web para hacer pronósticos del Mundial de Fútbol 2026 (USA, México, Canadá) entre amigos. Proyecto personal, no comercial.

**URL producción:** https://polla-mundialista-six.vercel.app
**Repositorio:** https://github.com/ACL06/PollaMundialista

**Fase actual:** MVP autenticación + perfil completos. Aún no se implementan los módulos de partidos, pronósticos ni rankings — esos vienen después en el roadmap.

**Disclaimer:** El proyecto NO está afiliado a FIFA. No usar logos, marcas ni mascotas oficiales (ver sección de copyright más abajo).

---

## Estado actual

### ✅ Completado

- Scaffolding inicial Next.js 15 + React 19 + TypeScript
- Login con OTP por correo (`/login` → `/verify`)
- Conexión Supabase (Auth + Postgres + RLS)
- Logo propio (SVG inline con `currentColor`)
- Tema claro/oscuro con `next-themes`
- Middleware que protege rutas privadas y refresca sesión
- Headers de seguridad en `next.config.mjs` (incluyendo CSP completa)
- Workflows GitHub Actions (CI lint/typecheck/build + keep-alive Supabase)
- **Deploy a Vercel funcionando en producción**
- **Fase 2 — Perfil completo:** onboarding con nickname (único) + galería de 6 avatares DiceBear + selector de equipo favorito (44 selecciones WC 2026)
- **Límite de 3 intentos en OTP** con redirect a `/login` y banner explicativo
- **Vercel Analytics + Speed Insights** activos
- **Favicon en metadata** apuntando a SVG
- Validación estricta de `avatar_url` con regex completa de DiceBear

### ⏳ Pendiente

- Verificar dominio en Resend para abrir a otros usuarios (hoy solo el email registrado en Resend recibe OTP)
- Avanzar al roadmap (Fase 3 en adelante)

---

## Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | Next.js 15 App Router + React 19 + TypeScript | Server Actions para mutations |
| Estilos | Tailwind CSS 3 + componentes propios | CSS variables para temas, paleta tricolor |
| Auth | `@supabase/ssr` con Email OTP | Cookies HttpOnly automáticas |
| Base de datos | Supabase Postgres con RLS | Tabla `profiles` con trigger desde `auth.users` |
| SMTP | Resend (custom SMTP en Supabase) | El default de Supabase es 2 emails/hora — inviable |
| Animaciones | Framer Motion | Solo donde aporta UX |
| Iconos | Lucide React | Outline only |
| Validación | Zod | Schemas en `src/lib/validators/` |
| Avatares | DiceBear v9 (`avataaars`) | Vía URL, sin SDK |
| Observabilidad | Vercel Analytics + Speed Insights | Web Vitals y page views |
| Hosting | Vercel (Hobby/Free) | Auto-deploy en push a main |
| CI | GitHub Actions | Lint + typecheck + build en PRs |

---

## Servicios externos configurados

### Supabase
- **Proyecto:** ver `.env.local` para URL real
- **Email OTP** habilitado, **Confirm email** desactivado
- **Templates de email editados:** Magic Link (login real) e Invite user (admin)
- **SMTP custom** con Resend configurado
- **Tabla `profiles`** con columnas: `id`, `email`, `nickname`, `avatar_url`, `favorite_team`, `country` (legacy, no usado), `created_at`, `updated_at`
- **Índice único** en `lower(nickname)` para case-insensitive uniqueness
- **RLS policies:** SELECT, UPDATE, **INSERT** (las tres permiten solo al propio usuario sobre su fila)
- **Trigger `on_auth_user_created`** crea automáticamente perfil al registrarse — verificado funcional
- **Región:** East US (North Virginia)

### Resend
- **Sender actual:** `onboarding@resend.dev`
- **Restricción crítica:** sin dominio verificado, **solo el email registrado en Resend recibe correos** (rest fallan con 550). Para abrir a otros usuarios hay que verificar un dominio.
- **Free tier:** 3,000 emails/mes, 100/día

### Vercel
- **Repo:** `ACL06/PollaMundialista`
- **Branch de producción:** `main`
- **URL producción:** `polla-mundialista-six.vercel.app`
- **Preview deployments:** automáticos en PRs/branches
- **Scope:** `alvarocastano6-6261s-projects`
- **Variables de entorno requeridas en los 3 ambientes:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (sin prefijo `NEXT_PUBLIC_`, solo server-side)
  - `NEXT_PUBLIC_SITE_URL`

---

## Decisiones de arquitectura clave

1. **No usar contraseñas, solo OTP por email.** Reduce fricción y elimina vulnerabilidades de password.
2. **Supabase Auth en vez de Clerk/Auth.js/Firebase.** El único proveedor con OTP de 6 dígitos nativo + free tier amplio + Postgres incluido.
3. **Server Actions sobre API Routes** para mutations. Idiomático en Next.js 15.
4. **Three Supabase clients separados** (browser, server, middleware) siguiendo el patrón oficial de `@supabase/ssr`.
5. **Route groups `(auth)`, `(setup)` y `(app)`** para separar layouts sin afectar URLs.
6. **Trigger en Postgres** (no en código) para sincronizar `auth.users` → `public.profiles`. Garantiza atomicidad.
7. **`upsert` en lugar de `update`** en `saveProfile` como red de seguridad: si el trigger falla, el upsert crea la fila.
8. **Logo inline como SVG** (no via `next/image`) para que `currentColor` herede del tema.
9. **Paleta tricolor (verde primary, rojo secondary, azul tertiary)** evoca a los tres países anfitriones.
10. **Mensajes de error genéricos** en auth para no leakear si un email existe.
11. **Galería de 6 avatares en lugar de selector M/F.** Más inclusivo, mejor UX, evita categorización binaria.
12. **3 intentos máximo de OTP** con redirect forzado a `/login` tras agotarlos. Defense in depth contra el rate-limit nativo de Supabase.
13. **Lista `WORLD_CUP_TEAMS` como constante TypeScript** por ahora. Se migrará a tabla Supabase cuando lleguen `teams` y `matches` en Fase 3.
14. **CSP completa con `vercel.live` permitido** para que la toolbar de feedback funcione en previews. En producción esos orígenes no se usan.

---

## Convenciones del código

### Imports
- Alias `@/*` apunta a `src/*` (configurado en `tsconfig.json`).
- Orden: externas → `@/*` → relativas.

### Componentes
- Server Components por defecto. `'use client'` solo cuando hay interactividad/hooks.
- Server Actions en archivos `actions.ts` adyacentes a la ruta que las usa.
- Componentes de UI puros (Button, Input) en `src/components/ui/`.
- Componentes específicos de auth en `src/components/auth/`.

### Estilos
- Tailwind utility classes con `cn()` helper de `@/lib/utils`.
- Colores SIEMPRE via tokens (`bg-primary`, `text-foreground`) — nunca hardcodeados excepto los tricolor del logo.
- Dark mode automático vía clase `.dark` en `<html>` (next-themes lo maneja).

### Tipos
- TypeScript estricto. Sin `any`.
- Tipos de Supabase: cuando se conecte la DB, generar con `supabase gen types typescript --linked > src/types/supabase.ts`.

### Commits
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- En español, mensaje corto en la primera línea + descripción extendida si aplica.
- **Sin trailer `Co-Authored-By`.** El usuario lo pidió explícitamente.
- HEREDOC para mensajes multilínea.

### Branches
- `main` → producción (protegida).
- `feat/<slug>` → features individuales.
- `fix/<slug>` → bugfixes pequeños.
- `chore/<slug>` → mantenimiento.

---

## Flujo de trabajo (PR → Preview → Merge)

Confirmado y adoptado para todo cambio sustancial:

```
1. git checkout -b feat/<nombre>
2. ... cambios ...
3. git commit -m "feat: ..."
4. git push -u origin feat/<nombre>
   └─→ Vercel crea preview automático
5. Abrir PR en GitHub (branch protection sin reviewers requeridos)
6. Validar en preview URL
7. Merge a main (squash merge para historia limpia)
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
```

---

## Roadmap

Orden sugerido por dependencias técnicas:

1. ✅ **Fase 1 — Auth con OTP**
2. ✅ **Fase 2 — Perfil mínimo** (nickname, avatar galería, equipo favorito)
3. ⏳ **Fase 3 — Catálogo de partidos:** tablas `teams`, `matches`, seed con calendario Mundial 2026.
4. **Fase 4 — Pronósticos:** tabla `predictions`, UI para predecir, lock al inicio del partido, scoring (3 pts exacto, 1 pt ganador).
5. **Fase 5 — Rankings:** vista materializada en Postgres + página `/ranking`.
6. **Fase 6 — Grupos privados:** ligas con código de invitación.
7. **Fase 7 — Notificaciones:** emails recordatorios via Resend + verificar dominio Resend antes.
8. **Fase 8 — Panel admin:** registrar resultados oficiales, recálculo automático.

**No abordar todavía:** pagos, monetización (en Colombia requiere licencia Coljuegos), módulo de chat.

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
- `.env.local` siempre en `.gitignore` (verificar antes de commits).
- RLS activo en todas las tablas desde día 1 (SELECT + UPDATE + INSERT en `profiles`).
- Headers de seguridad configurados en `next.config.mjs` incluyendo CSP completa.
- Mensajes genéricos para errores de auth.
- Validación Zod en cada Server Action.
- Límite de intentos de OTP (3) con redirect forzado.
- `avatar_url` validado con regex estricta de DiceBear.

### Privacidad
- Aviso de privacidad en footer (Ley 1581 de Colombia aplica).
- No recolectar más datos de los necesarios.

---

## Cuidados específicos del free tier

- **Supabase Free se pausa tras 7 días de inactividad.** Workflow `keep-alive.yml` configurado para hacer ping cada 6 días.
- **Resend Free:** 100 emails/día, 3000/mes. Suficiente para una polla.
- **Vercel Free:** 100 GB bandwidth/mes.

---

## Deuda técnica conocida (no urgente)

- **Rate limiting server-side:** hoy solo se confía en el rate-limit nativo de Supabase + límite de 3 intentos UI. Si se abre a más usuarios, agregar tabla `rate_limit` en Postgres o Upstash Redis.
- **Lista de equipos como constante TS:** migrar a tabla `teams` en Fase 3.
- **Font preload warnings:** Next.js precarga 3 fuentes pero algunas páginas solo usan 1-2. Cosmético.
- **CSP con `'unsafe-inline'`:** requerido por Next.js sin nonce setup. Aceptable para este scope.

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
- Para nuevos componentes, seguir la estructura existente (ver `src/components/auth/` como referencia).
- Para nuevas Server Actions, ponerlas en `actions.ts` adyacente a la página que las usa.
- Cuando se necesite SQL contra Supabase, mostrar el SQL primero y pedir que el usuario lo ejecute en SQL Editor (no se tiene acceso directo a la DB desde acá).
- Nunca commitear `.env.local`. Nunca commitear secretos.
- **No incluir `Co-Authored-By` en los mensajes de commit.**
- Para cambios sustanciales, crear branch `feat/<nombre>`, push, esperar preview Vercel, mergear con squash.
- Mantener este `CLAUDE.md` actualizado tras hitos importantes — la deuda técnica también se documenta acá.
