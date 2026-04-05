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

/**
 * Read the raw request body as a string (handles cases where req.body is not pre-parsed).
 */
function readRawBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined && req.body !== null) {
      // Already parsed by Vercel — stringify back so we can re-parse uniformly
      if (typeof req.body === 'object') {
        resolve(null); // signal: use req.body directly
        return;
      }
      resolve(String(req.body));
      return;
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

module.exports = async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const COOKIE_NAME = 'admin_auth';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
  // Only set Secure on HTTPS (omit for local HTTP dev)
  const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https') ||
                  (req.headers.host || '').includes('vercel.app') ||
                  (req.headers.host || '').includes('netlify');
  const secureAttr = isHttps ? '; Secure' : '';
  const COOKIE_ATTRS = `Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly${secureAttr}; SameSite=Lax`;

  const origin = req.headers.origin || `http${isHttps ? 's' : ''}://${req.headers.host || 'localhost:3000'}`;
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  if (req.method !== 'POST') {
    return res.redirect('/admin-login.html');
  }

  // No password configured — allow through
  if (!ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=no_password_configured; ${COOKIE_ATTRS}`);
    return res.redirect('/admin/');
  }

  // Rate limit check
  if (isLoginRateLimited(ip)) {
    console.warn('[admin-login] Rate limit exceeded for IP:', ip);
    return res.redirect('/admin-login.html?error=ratelimit');
  }

  // Parse body — handle Vercel pre-parsed object, raw string, or stream
  let password = '';
  let redirect = '/admin/';

  if (req.body && typeof req.body === 'object') {
    // Vercel pre-parsed (JSON or form-encoded)
    password = String(req.body.password || '');
    redirect = String(req.body.redirect || '/admin/');
  } else {
    const raw = await readRawBody(req);
    if (raw) {
      // Try JSON first, fall back to URL-encoded
      try {
        const parsed = JSON.parse(raw);
        password = String(parsed.password || '');
        redirect = String(parsed.redirect || '/admin/');
      } catch {
        const params = new URLSearchParams(raw);
        password = params.get('password') || '';
        redirect = params.get('redirect') || '/admin/';
      }
    }
  }

  if (password !== ADMIN_PASSWORD) {
    const safeDest = safeRedirect(redirect, origin);
    return res.redirect(`/admin-login.html?redirect=${encodeURIComponent(safeDest)}&error=invalid`);
  }

  // Success — set signed session token cookie (not the password itself)
  const sessionToken = makeSessionToken(ADMIN_PASSWORD);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; ${COOKIE_ATTRS}`);
  return res.redirect(safeRedirect(redirect, origin));
};
