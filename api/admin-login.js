/**
 * api/admin-login.js — Adelaide Pavilion
 *
 * Validates the admin password and redirects to /admin or back to login.
 * Set ADMIN_PASSWORD in Vercel environment variables.
 */

'use strict';

const crypto = require('crypto');

// In-memory rate limiting for login attempts
const loginAttempts = new Map();
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isLoginRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
  if (now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  return entry.count > LOGIN_LIMIT;
}

function safeRedirect(redirect, origin) {
  try {
    const target = new URL(redirect, origin);
    if (target.origin !== new URL(origin).origin) {
      return '/admin/';
    }
    return target.pathname + (target.search || '');
  } catch {
    return '/admin/';
  }
}

function makeSessionToken(password) {
  return crypto.createHmac('sha256', password).update('admin_session').digest('hex');
}

module.exports = async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const COOKIE_NAME = 'admin_auth';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
  const COOKIE_ATTRS = `Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;

  const origin = req.headers.origin || 'https://adelaide-pavilion-website.vercel.app';
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  console.log('[admin-login] ADMIN_PASSWORD set:', !!ADMIN_PASSWORD);

  if (req.method !== 'POST') {
    return res.redirect('/admin-login.html');
  }

  // No password configured — allow through
  if (!ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=no_password_configured; ${COOKIE_ATTRS}`);
    return res.redirect(new URL('/admin/', origin).toString());
  }

  // Rate limit check
  if (isLoginRateLimited(ip)) {
    console.warn('[admin-login] Rate limit exceeded for IP:', ip);
    const url = new URL('/admin-login.html', origin);
    url.searchParams.set('error', 'ratelimit');
    return res.redirect(url.toString());
  }

  // Parse body - handle both JSON and form-encoded
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      const params = new URLSearchParams(body);
      body = {
        password: params.get('password') || '',
        redirect: params.get('redirect') || '/admin/'
      };
    }
  }

  const password = body?.password || '';
  const redirect = body?.redirect || '/admin/';

  if (password !== ADMIN_PASSWORD) {
    console.log('[admin-login] Auth attempt failed from IP:', ip);
    const safeDest = safeRedirect(redirect, origin);
    const url = new URL('/admin-login.html', origin);
    url.searchParams.set('redirect', safeDest);
    url.searchParams.set('error', 'invalid');
    return res.redirect(url.toString());
  }

  // Success — set signed session token cookie (not the password itself)
  const sessionToken = makeSessionToken(ADMIN_PASSWORD);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; ${COOKIE_ATTRS}`);

  console.log('[admin-login] Auth success from IP:', ip);
  return res.redirect(safeRedirect(redirect, origin));
};
