import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allowlist the quality values used across the app.
    // Next.js refuses to serve a quality not in this list.
    qualities: [75, 90],
    // Serve modern formats — Next.js auto-picks the best one the browser supports.
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    const securityHeaders = [
      // Prevent clickjacking — the app should never be embedded in an iframe
      { key: "X-Frame-Options", value: "DENY" },
      // Prevent MIME type sniffing
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Don't send Referer header to cross-origin destinations (prevents token leaks)
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable access to camera/mic/geolocation (not used by the dashboard)
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // Force HTTPS for 1 year (only takes effect over HTTPS)
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
    ];

    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Prevent the AR viewer from being cached / stored in BFCache.
        // 8th Wall engine state (camera, WASM, WebGL) does not survive a
        // back/forward cache restore, so we force the browser to fetch
        // fresh HTML and re-execute all scripts on every visit.
        source: "/ar-viewer/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },

};

export default nextConfig;
