import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" is only needed for the Docker/self-hosted path (Stage 2).
  // Vercel builds and serves the app itself, so this stays off for now.
};

export default nextConfig;
