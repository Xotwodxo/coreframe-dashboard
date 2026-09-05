import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo sits inside the Coreframe vault, which is itself a git checkout.
  // Pinning the root stops Turbopack walking up and adopting a stray lockfile.
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Client logos live in the project's public Storage bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rlxoscsvlughbexjonyn.supabase.co",
        pathname: "/storage/v1/object/public/client-logos/**",
      },
    ],
  },
};

export default nextConfig;
