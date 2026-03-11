import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except Next.js internals, static files, and API/socket routes
  matcher: ['/((?!_next|_vercel|api|socket\\.io|health|.*\\..*).*)', '/'],
};
