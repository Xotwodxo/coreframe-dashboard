import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo sits inside the Coreframe vault, which is itself a git checkout.
  // Pinning the root stops Turbopack walking up and adopting a stray lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
