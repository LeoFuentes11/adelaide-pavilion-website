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

function makeSessionToken(username, password) {
  return crypto.createHmac('sha256', password).update('admin_session_' + username).digest('hex');
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Skip in local dev where the env var isn't set
    console.warn('[admin-login] TURNSTILE_SECRET_KEY not set — skipping Turnstile check');
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString()
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
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
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const COOKIE_NAME = 'admin_auth';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
  // Only set Secure on HTTPS (omit for local HTTP dev)
  const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https') ||
                  (req.headers.host || '').includes('vercel.app') ||
                  (req.headers.host || '').includes('netlify');
  const secureAttr = isHttps ? '; Secure' : '';
  const COOKIE_ATTRS = `Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly${secureAttr}; SameSite=Strict`;

  const origin = req.headers.origin || `http${isHttps ? 's' : ''}://${req.headers.host || 'localhost:3000'}`;
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  if (req.method !== 'POST') {
    return res.status(302).setHeader('Location', '/admin-login.html').end();
  }

  // No credentials configured — deny; ADMIN_USERNAME and ADMIN_PASSWORD must be set in Vercel env vars
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('[admin-login] ADMIN_USERNAME or ADMIN_PASSWORD not set — access denied');
    return res.status(302).setHeader('Location', '/admin-login.html?error=misconfigured').end();
  }

  // Rate limit check
  if (isLoginRateLimited(ip)) {
    console.warn('[admin-login] Rate limit exceeded for IP:', ip);
    return res.status(302).setHeader('Location', '/admin-login.html?error=ratelimit').end();
  }

  // Parse body — handle Vercel pre-parsed object, raw string, or stream
  let username = '';
  let password = '';
  let redirect = '/admin/';
  let turnstileToken = '';

  if (req.body && typeof req.body === 'object') {
    // Vercel pre-parsed (JSON or form-encoded)
    username = String(req.body.username || '');
    password = String(req.body.password || '');
    redirect = String(req.body.redirect || '/admin/');
    turnstileToken = String(req.body['cf-turnstile-response'] || '');
  } else {
    const raw = await readRawBody(req);
    if (raw) {
      // Try JSON first, fall back to URL-encoded
      try {
        const parsed = JSON.parse(raw);
        username = String(parsed.username || '');
        password = String(parsed.password || '');
        redirect = String(parsed.redirect || '/admin/');
        turnstileToken = String(parsed['cf-turnstile-response'] || '');
      } catch {
        const params = new URLSearchParams(raw);
        username = params.get('username') || '';
        password = params.get('password') || '';
        redirect = params.get('redirect') || '/admin/';
        turnstileToken = params.get('cf-turnstile-response') || '';
      }
    }
  }

  // Verify Turnstile bot challenge before checking credentials
  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    console.warn('[admin-login] Turnstile verification failed for IP:', ip);
    const safeDest = safeRedirect(redirect, origin);
    return res.status(302).setHeader('Location', `/admin-login.html?redirect=${encodeURIComponent(safeDest)}&error=bot`).end();
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    const safeDest = safeRedirect(redirect, origin);
    return res.status(302).setHeader('Location', `/admin-login.html?redirect=${encodeURIComponent(safeDest)}&error=invalid`).end();
  }

  // Success — set signed session token cookie (not the credentials themselves)
  const sessionToken = makeSessionToken(ADMIN_USERNAME, ADMIN_PASSWORD);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; ${COOKIE_ATTRS}`);
  return res.status(302).setHeader('Location', safeRedirect(redirect, origin)).end();
};
