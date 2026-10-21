import type { NextConfig } from "next";

// Protections that need no change in the pages. The policy does not limit scripts yet: Next.js
// and our theme script are inline, and locking that down needs a per-request nonce, which would
// turn the static pages into dynamic ones. Revisit when there is a backend.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // AVIF is smaller than WebP at the same quality; browsers without it still get WebP.
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    // A life situation has no page of its own: its services are the catalog filtered by it.
    return [
      {
        source: "/:lang(ru|kk|en)/situations",
        destination: "/:lang/services",
        permanent: false,
      },
      {
        source: "/:lang(ru|kk|en)/situations/:slug",
        destination: "/:lang/services?situation=:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
