import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
