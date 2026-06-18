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

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
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
    ];
  },
};

export default nextConfig;
