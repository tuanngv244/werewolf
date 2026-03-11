import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@werewolf-game/shared'],
};

export default withNextIntl(nextConfig);
