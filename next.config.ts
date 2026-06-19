import type { NextConfig } from "next";

/**
 * CORS for the Chrome extension.
 *
 * Extensions cannot use Access-Control-Allow-Origin: "*" together with
 * credentialed requests. Instead the server has to echo the specific
 * `chrome-extension://<extension-id>/...` origin and add
 * Access-Control-Allow-Credentials: true.
 *
 * Next.js header rules don't support echoing the request origin directly, so
 * we set Allow-Origin to a wildcard for tool endpoints (they accept
 * Authorization: Bearer Firebase ID tokens, which are not cookies and
 * therefore compatible with the wildcard) and additionally surface the
 * Authorization header for preflight.
 */
const corsHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
  {
    key: "Access-Control-Allow-Headers",
    value: "Content-Type, Authorization, X-Requested-With",
  },
  { key: "Access-Control-Max-Age", value: "86400" },
];

/**
 * App-level security headers (AUTH-M9, AUTH-L4).
 *
 * Applied to every non-API path. The API has its own CORS dance and doesn't
 * need a CSP. The CSP is intentionally permissive enough to let Stripe.js,
 * Firebase Auth, and Google AdSense load; tighten this any time you drop a
 * third-party dependency.
 *
 * HSTS preload is OFF until we're confident about all *.hiretuner.com
 * subdomains — the operator can flip `preload` to true and submit to
 * hstspreload.org once ready.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\")",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Stripe + Firebase + AdSense scripts. 'unsafe-inline' is needed for
      // Next.js inline script bootstraps and AdSense's runtime; 'unsafe-eval'
      // is needed for some Stripe iframes.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.googleadservices.com https://www.gstatic.com https://*.firebaseio.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "frame-src 'self' https://js.stripe.com https://*.stripe.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://*.firebaseapp.com https://accounts.google.com",
      // Firebase auth and our own endpoints plus AdSense reporting.
      "connect-src 'self' https://hiretuner.com https://*.hiretuner.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://api.stripe.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // The Java-only guide was generalized into /salary-guide/[role]. Keep the
      // old URL alive (301) so existing links and search rankings carry over.
      {
        source: "/java-developer-salary-guide",
        destination: "/salary-guide/java-developer",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/tools/:path*",
        headers: corsHeaders,
      },
      {
        source: "/api/auth/firebase",
        headers: corsHeaders,
      },
      {
        source: "/api/resumes/:path*",
        headers: corsHeaders,
      },
      {
        source: "/api/usage",
        headers: corsHeaders,
      },
      // App-level security headers on every non-API path. API routes have
      // their own CORS/CSP semantics; the CSP would block Stripe webhook
      // POST replies if applied uniformly.
      {
        source: "/((?!api).*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
