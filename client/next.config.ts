import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@werewolf-game/shared'],
};

export default withNextIntl(nextConfig);
