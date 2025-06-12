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
