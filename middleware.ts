/**
 * middleware.ts — Adelaide Pavilion
 *
 * Vercel Edge Middleware: protects /admin/* behind a password gate.
 * Set ADMIN_PASSWORD in Vercel environment variables.
 *
 * Uses standard Web APIs (no next/server) so it works on static sites.
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const COOKIE_NAME = 'admin_auth';

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // Skip protection for the login page itself
  if (url.pathname === '/admin-login.html') {
    return;
  }

  // Only protect /admin routes
  if (!url.pathname.startsWith('/admin')) {
    return;
  }

  // No password set — allow access (dev fallback)
  if (ADMIN_PASSWORD === 'ENV:ADMIN_PASSWORD' || !ADMIN_PASSWORD) {
    return;
  }

  // Check auth cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const storedPassword = match ? match[2] : null;

  if (storedPassword === ADMIN_PASSWORD) {
    return;
  }

  // Not authenticated — redirect to login with return URL
  const loginUrl = new URL('/admin-login.html', url.origin);
  loginUrl.searchParams.set('redirect', url.pathname);
  return Response.redirect(loginUrl.toString(), 302);
}

export const config = {
  matcher: ['/admin/:path*'],
};
