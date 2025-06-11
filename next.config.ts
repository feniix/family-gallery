import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-e8e853c5cccc47f08b452ee0f1fe4e50.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Reduce default logging since we have structured access logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
