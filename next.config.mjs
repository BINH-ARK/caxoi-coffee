/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'mysql2'],
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.vietqr.io',
      },
      {
        protocol: 'https',
        hostname: 'img.vietqr.io',
      },
    ],
  },
};

export default nextConfig;
