import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Off deliberately: on a data-driven site the TypeScript types ARE the
  // content validation, so a type error must fail the build.
  typescript: { ignoreBuildErrors: false },
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig
