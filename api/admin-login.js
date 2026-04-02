/**
 * api/admin-login.js — Adelaide Pavilion
 *
 * Validates the admin password and sets an auth cookie.
 * Environment variable: ADMIN_PASSWORD
 */

'use strict';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const COOKIE_NAME = 'admin_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  if (req.method !== 'POST') {
    return res.redirect('/admin-login.html');
  }

  // No password configured
  if (!ADMIN_PASSWORD) {
    const redirect = req.body?.redirect || '/admin/';
    const origin = req.headers.origin || 'https://adelaidepavilion.com.au';
    const url = new URL('/admin-login.html', origin);
    url.searchParams.set('redirect', String(redirect));
    return res.redirect(url.toString());
  }

  let body = req.body || {};

  // Handle JSON body
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const password = body.password || '';
  const rawRedirect = body.redirect || '/admin/';
  const safeRedirect = typeof rawRedirect === 'string' && rawRedirect.startsWith('/')
    ? rawRedirect
    : '/admin/';

  if (password !== ADMIN_PASSWORD) {
    const origin = req.headers.origin || 'https://adelaidepavilion.com.au';
    const url = new URL('/admin-login.html', origin);
    url.searchParams.set('redirect', safeRedirect);
    url.searchParams.set('error', 'invalid');
    return res.redirect(url.toString());
  }

  // Success — set cookie and redirect
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`
  );

  return res.redirect(safeRedirect);
};
