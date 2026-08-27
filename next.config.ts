import type { NextConfig } from "next";

/**
 * `output: "standalone"` produces a self-contained server bundle for Docker.
 * It is only enabled when DOCKER_BUILD=1 so local `next start` (and managed
 * preview environments) keep working exactly as before.
 */
const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
