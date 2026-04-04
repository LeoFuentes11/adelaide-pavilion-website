/**
 * api/admin-login.js — Adelaide Pavilion
 *
 * Validates the admin password and redirects to /admin or back to login.
 * Set ADMIN_PASSWORD in Vercel environment variables.
 */

'use strict';

module.exports = async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const COOKIE_NAME = 'admin_auth';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

  const origin = req.headers.origin || 'https://adelaide-pavilion-website.vercel.app';
  console.log('[admin-login] ADMIN_PASSWORD set:', !!ADMIN_PASSWORD);

  if (req.method !== 'POST') {
    return res.redirect('/admin-login.html');
  }

  // No password configured — allow through
  if (!ADMIN_PASSWORD) {
    res.setHeader(
      'Set-Cookie',
      `admin_auth=no_password_configured; Path=/; Max-Age=${COOKIE_MAX_AGE}`
    );
    return res.redirect(new URL('/admin/', origin).toString());
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const password = body?.password || '';
  const redirect = body?.redirect || '/admin/';
  console.log('[admin-login] password match:', password === ADMIN_PASSWORD);

  if (password !== ADMIN_PASSWORD) {
    const url = new URL('/admin-login.html', origin);
    url.searchParams.set('redirect', redirect);
    url.searchParams.set('error', 'invalid');
    return res.redirect(url.toString());
  }

  // Success — set cookie and redirect
  res.setHeader(
    'Set-Cookie',
    `admin_auth=${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; Max-Age=${COOKIE_MAX_AGE}`
  );

  console.log('[admin-login] redirecting to:', redirect);
  return res.redirect(new URL(redirect, origin).toString());
};