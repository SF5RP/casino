import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8011/api/:path*',
      },
      {
        source: '/ws',
        destination: 'http://localhost:8011/ws',
      },
    ];
  },
};

export default nextConfig;
