import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Ensure API routes are properly handled
  async rewrites() {
    return [];
  },
  // Configure for SSR/SSG
  experimental: {
    // Optimize for production
  },
};

export default nextConfig;
