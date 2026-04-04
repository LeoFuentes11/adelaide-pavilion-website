/**
 * api/admin-login.js — Adelaide Pavilion
 *
 * Validates the admin password and redirects to /admin or back to login.
 * Set ADMIN_PASSWORD in Vercel environment variables.
 */

'use strict';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');

  if (req.method !== 'POST') {
    return res.redirect('/admin-login.html');
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
  const COOKIE_NAME = 'admin_auth';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

  const origin = req.headers.origin || 'https://adelaide-pavilion-website.vercel.app';
  const LOGIN_URL = new URL('/admin-login.html', origin).toString();

  function redirectWithError(redirectPath, error) {
    const url = new URL('/admin-login.html', origin);
    url.searchParams.set('redirect', redirectPath);
    url.searchParams.set('error', error);
    return res.redirect(url.toString());
  }

  // No password configured — allow through
  if (!ADMIN_PASSWORD) {
    const body = req.body || {};
    const redirect = typeof body.redirect === 'string' && body.redirect.startsWith('/')
      ? body.redirect
      : '/admin/';
    return res.redirect(new URL(redirect, origin).toString());
  }

  // Parse body — handles both JSON and form-encoded
  const rawBody = req.body || {};
  let password = '';
  let rawRedirect = '/admin/';

  if (typeof rawBody === 'object') {
    password = rawBody.password || '';
    rawRedirect = rawBody.redirect || '/admin/';
  } else if (typeof rawBody === 'string' && rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      password = parsed.password || '';
      rawRedirect = parsed.redirect || '/admin/';
    } catch {
      // Not JSON — try form-encoded key=value&key=value
      rawBody.split('&').forEach(pair => {
        const [k, v] = pair.split('=').map(d => decodeURIComponent(d || ''));
        if (k === 'password') password = v;
        if (k === 'redirect') rawRedirect = v;
      });
    }
  }

  const safeRedirect = typeof rawRedirect === 'string' && rawRedirect.startsWith('/')
    ? rawRedirect
    : '/admin/';

  if (password !== ADMIN_PASSWORD) {
    return redirectWithError(safeRedirect, 'invalid');
  }

  // Success — set cookie and redirect
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`
  );

  return res.redirect(new URL(safeRedirect, origin).toString());
};
