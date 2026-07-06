import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile outside the repo does not
  // change how Turbopack resolves files
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
