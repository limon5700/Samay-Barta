
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false, // Changed to false to show TypeScript errors
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
  // SWC is the default compiler for Next.js. Turbopack can be enabled by
  // setting `compiler: { turbopack: true }` or by using the `--turbo` flag.
  // If facing SWC build errors, ensure your node_modules and .next folders are clean.
  // compiler: {
  //   // Turbopack can be enabled by removing this or setting it to 'turbopack'
  //   // For SWC:
  //   // styledComponents: true, // Example for styled-components, if used
  // },
};

export default nextConfig;
