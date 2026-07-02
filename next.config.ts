import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores the stray ~/pnpm-lock.yaml.
  // Use cwd so this works in any git worktree (gampex-web, gampex-web-ua, ...).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
