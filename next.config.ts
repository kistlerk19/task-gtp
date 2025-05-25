import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  logging: {
    fetches: {
      fullUrl: false
    }
  }
};

export default nextConfig;
