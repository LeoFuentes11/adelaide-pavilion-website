/**
 * middleware.ts — Adelaide Pavilion
 *
 * Edge Middleware: protects /admin/* behind a password gate.
 * Set ADMIN_PASSWORD in Vercel environment variables.
 * On first visit: redirect to /admin-login.html?redirect=<original path>
 * On successful login: set cookie and redirect to original path.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const COOKIE_NAME = 'admin_auth';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Skip protection for the login page itself and non-admin paths
  if (!url.pathname.startsWith('/admin') || url.pathname === '/admin-login.html') {
    return NextResponse.next();
  }

  // No password set — allow access (dev only)
  if (!ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  // Check auth cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue === ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login with return URL
  const redirectUrl = new URL('/admin-login.html', url.origin);
  redirectUrl.searchParams.set('redirect', url.pathname);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
