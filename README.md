# Polla Mundialista

MVP del flujo de autenticación con OTP por correo para la Polla Mundialista.

## Stack

- **Next.js 15** (App Router) + TypeScript + React 19
- **Tailwind CSS 3** + componentes propios
- **Supabase** (Auth con Email OTP + Postgres + RLS)
- **Framer Motion** para animaciones
- **Resend** como SMTP custom
- **Vercel** para hosting + CI/CD
- **GitHub Actions** para lint/typecheck/build en PRs

## Estructura

```
src/
├── app/
│   ├── layout.tsx               # Root layout con ThemeProvider + fonts
│   ├── page.tsx                 # Redirige a /login o /home según sesión
│   ├── globals.css              # Tokens + paleta tricolor
│   ├── (auth)/                  # Rutas públicas con layout temático
│   │   ├── layout.tsx
│   │   ├── login/               # Pantalla 1: ingreso de email
│   │   │   ├── page.tsx
│   │   │   └── actions.ts       # Server Action: sendOtp
│   │   └── verify/              # Pantalla 2: ingreso de OTP
│   │       ├── page.tsx
│   │       ├── VerifyForm.tsx
│   │       └── actions.ts       # Server Action: verifyOtp
│   └── (app)/                   # Rutas protegidas (post-login)
│       ├── layout.tsx
│       ├── LogoutButton.tsx
│       └── home/page.tsx
├── components/
│   ├── auth/                    # EmailForm, OtpInput, ResendButton
│   ├── theme/                   # ThemeProvider, ThemeToggle
│   ├── shared/                  # Logo (SVG inline con currentColor)
│   └── ui/                      # Button, Input
├── lib/
│   ├── supabase/                # client, server, middleware
│   ├── validators/              # Schemas Zod
│   └── utils.ts
├── hooks/
│   └── useCountdown.ts
└── middleware.ts                # Protege rutas + refresca sesión
```

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa con tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Arrancar el servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Flujo de autenticación

1. Usuario ingresa su email en `/login`.
2. Server Action `sendOtp` invoca `supabase.auth.signInWithOtp` que dispara un email con un código de 6 dígitos (template "Magic Link" en Supabase).
3. Usuario es redirigido a `/verify?email=...`.
4. Usuario ingresa los 6 dígitos. Server Action `verifyOtp` invoca `supabase.auth.verifyOtp`.
5. Si es correcto, Supabase crea la sesión (cookie HttpOnly) y el usuario es redirigido a `/home`.
6. El middleware (`src/middleware.ts`) refresca el token en cada request y protege las rutas privadas.

## Variables de entorno requeridas

| Variable | ¿Pública? | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Anon key (RLS la protege) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Solo server-side. Bypasea RLS |
| `NEXT_PUBLIC_SITE_URL` | Sí | URL base por ambiente |

Estas se configuran en Vercel → Project Settings → Environment Variables, replicadas para los tres ambientes (Production, Preview, Development).

## Scripts disponibles

```bash
npm run dev         # Servidor de desarrollo (puerto 3000)
npm run build       # Build de producción
npm start           # Servir el build de producción
npm run lint        # ESLint
npm run typecheck   # TypeScript sin emitir
```

## Despliegue

El proyecto está configurado para auto-deploy en Vercel:

- **Push a `main`** → deploy a producción
- **Cualquier otra branch o PR** → preview deployment

Asegurarse de que las variables de entorno estén configuradas en Vercel antes del primer deploy.

## Disclaimer

Polla Mundialista es un proyecto independiente y no está afiliado, patrocinado ni avalado por
FIFA ni por ninguna federación oficial.

---

Para detalles completos de arquitectura, decisiones técnicas y roadmap, ver `polla-mundialista-arquitectura.md` y `setup-y-despliegue.md`.
