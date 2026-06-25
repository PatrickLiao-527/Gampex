import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores the stray ~/pnpm-lock.yaml.
  turbopack: {
    root: "/Users/whitegx/dev/gampex-web",
  },
};

export default nextConfig;
