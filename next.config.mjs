/** @type {import('next').NextConfig} */

// Content-Security-Policy — defensa en profundidad contra XSS y carga de
// recursos no autorizados. Se permite 'unsafe-inline' en scripts/styles
// porque Next.js inyecta scripts inline para hidratación y Tailwind genera
// estilos inline. Los orígenes externos están explícitamente listados.
//
// vercel.live + *.pusher.com: requeridos por la Vercel Live toolbar que
// se inyecta en previews (feedback widget). En producción no se carga,
// pero la directiva es defensiva.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: https://api.dicebear.com https://vercel.live https://vercel.com",
  "font-src 'self' data: https://vercel.live",
  "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://vercel.live wss://*.pusher.com",
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  // Avatares vienen de DiceBear como SVG. Para usar `next/image` con
  // ese origen externo necesitamos:
  //   - remotePatterns: lista blanca de hosts permitidos
  //   - dangerouslyAllowSVG: opt-in explícito; los SVG pueden contener
  //     scripts. Como DiceBear es una fuente controlada (URL armada con
  //     parámetros desde nuestro código), el riesgo es bajo.
  //   - contentSecurityPolicy: además sandboxea el SVG para que aunque
  //     trajera scripts inline, el navegador no los ejecute.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
