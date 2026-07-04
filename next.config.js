const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    // Required on Next 14 for instrumentation.ts to run (Sentry + cron)
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude Google Cloud Storage from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        canvas: false,
      };
    }
    return config;
  },
}

module.exports = withSerwist(nextConfig)
