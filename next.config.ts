
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Keep this false to see TS errors
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  compiler: {
    // Explicitly define an empty compiler block to ensure default SWC behavior
    // and avoid potential inference of experimental features that might conflict
    // with the SWC setup on your environment.
  },
};

export default nextConfig;
