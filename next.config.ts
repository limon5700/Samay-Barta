
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
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
  // compiler: {
  //   // Turbopack can be enabled by removing this or setting it to 'turbopack'
  //   // For SWC:
  //   // styledComponents: true, // Example for styled-components, if used
  // },
};

export default nextConfig;
