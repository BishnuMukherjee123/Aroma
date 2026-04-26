import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allowlist the quality values used across the app.
    // Next.js refuses to serve a quality not in this list.
    qualities: [75, 90],
    // Serve modern formats — Next.js auto-picks the best one the browser supports.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
