/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  eslint:
  {
    ignoreDuringBuilds: true
  },
  typescript:
  {
    ignoreBuildErrors: true
  },
  // Enables instrumentation.ts (the in-process idle-meeting sweep). Stable in
  // Next 15; on 14.x it's behind this experimental flag.
  experimental:
  {
    instrumentationHook: true,
    // Helps routes/RSC keep these server-only packages out of the bundle.
    serverComponentsExternalPackages: ['mongoose', 'livekit-server-sdk']
  },
  // The instrumentation hook pulls in lib/idleSweep.js (→ mongoose +
  // livekit-server-sdk), which reference Node built-ins (os, node:crypto) that
  // webpack can't bundle. serverComponentsExternalPackages doesn't reach the
  // instrumentation compile pass on Next 14, so externalize them here for the
  // server build — webpack then leaves them as runtime require()s.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'mongoose', 'livekit-server-sdk'];
    }
    return config;
  }

};

export default nextConfig;
