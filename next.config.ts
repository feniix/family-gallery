import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.fg.feniix-hq.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '4d38d810481402dae4e99fe589d6e4ee.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Production optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  // Reduce default logging since we have structured access logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Webpack configuration to handle AlaSQL dependencies
  webpack: (config, { isServer }) => {
    // Ignore React Native modules that AlaSQL tries to import
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native-fs': false,
      'react-native-fetch-blob': false,
      'react-native': false,
      'fs': false,
      'path': false,
    };

    // Add externals for server-side builds
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('react-native-fs', 'react-native-fetch-blob', 'react-native');
    }

    return config;
  },
};

export default nextConfig;
