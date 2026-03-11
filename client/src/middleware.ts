import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n';

export default createMiddleware({
  locales,
  defaultLocale,
});

export const config = {
  // Match all paths except Next.js internals, static files, and API/socket routes
  matcher: ['/((?!_next|_vercel|api|socket\\.io|health|.*\\..*).*)', '/'],
};
