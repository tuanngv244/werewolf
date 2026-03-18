import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@werewolf-game/shared'],
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow camera/microphone access for Jitsi Meet iframe
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, display-capture=*',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
