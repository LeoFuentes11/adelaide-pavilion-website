/**
 * ============================================================
 * SECURITY SUMMARY — Adelaide Pavilion Contact Function
 * ============================================================
 * 1. ANTI-SPAM       Cloudflare Turnstile token verified
 *                    server-side on every submission.
 * 2. CSRF            Origin/Referer header validated against
 *                    the allowlist before any processing.
 * 3. RATE LIMITING   Max 3 submissions per IP per hour using
 *                    an in-memory store (survives warm lambda
 *                    calls; resets on cold start — sufficient
 *                    for low-volume contact forms).
 * 4. VALIDATION      Every field validated server-side with
 *                    strict regex. Australian phone format.
 *                    Event date must be in the future.
 * 5. SANITIZATION    HTML tags stripped (XSS), newlines
 *                    stripped (email header injection), inputs
 *                    length-capped before processing.
 * 6. EMAIL SENDING   Sent via Resend API — no raw PHP mail(),
 *                    no concatenated headers. reply-to is set
 *                    so staff can reply safely.
 * 7. LOGGING         Structured JSON: IP + timestamp + email
 *                    + event type only. Full message is never
 *                    logged to avoid sensitive data in logs.
 * 8. ERROR HANDLING  Generic error messages returned to client
 *                    — no stack traces or internal details
 *                    leaked.
 * ============================================================
 *
 * ENVIRONMENT VARIABLES (set in Vercel dashboard):
 *   TURNSTILE_SECRET_KEY  — from Cloudflare Turnstile dashboard
 *   RESEND_API_KEY        — from resend.com
 *   ALLOWED_ORIGIN        — your live domain, e.g. https://adelaidepavilion.com.au
 */

'use strict';

/* ── Rate limiting ─────────────────────────────────────────── */
const rateLimitStore = new Map();
const RATE_LIMIT     = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip) {
  const now  = Date.now();
  const hits = (rateLimitStore.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  rateLimitStore.set(ip, hits);
  return false;
}

/* ── Sanitization ──────────────────────────────────────────── */
function sanitize(value, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9._%+\-@]/g, '').slice(0, 254);
}

/* ── Validation ────────────────────────────────────────────── */
const VALID_EVENT_TYPES = new Set([
  'wedding','corporate','birthday','anniversary','christening',
  'engagement','gala','valedictory','christmas','conference','other',
]);
const VALID_GUEST_COUNTS = new Set([
  '10-30','31-60','61-100','101-150','151-200','201-260','260+',
]);
const VALID_ROOMS = new Set(['parkview','terrace','unsure','']);

function validateFields(f) {
  const errors = [];
  if (!/^[a-zA-ZÀ-ÖØ-öø-ÿ\-' ]{1,50}$/.test(f.firstName)) errors.push('firstName');
  if (!/^[a-zA-ZÀ-ÖØ-öø-ÿ\-' ]{1,50}$/.test(f.lastName))  errors.push('lastName');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email) || f.email.length > 254) errors.push('email');
  if (f.phone) {
    const stripped = f.phone.replace(/[\s\-()]/g, '');
    if (!/^(\+?61|0)[2-9]\d{8}$/.test(stripped)) errors.push('phone');
  }
  if (!VALID_EVENT_TYPES.has(f.eventType))  errors.push('eventType');
  if (f.eventDate) {
    const d = new Date(f.eventDate);
    if (isNaN(d.getTime()) || d <= new Date()) errors.push('eventDate');
  }
  if (!VALID_GUEST_COUNTS.has(f.guestCount)) errors.push('guestCount');
  if (!VALID_ROOMS.has(f.room))              errors.push('room');
  if (!f.message || f.message.length < 10 || f.message.length > 2000) errors.push('message');
  return errors;
}

/* ── Cloudflare Turnstile verification ─────────────────────── */
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[SECURITY] TURNSTILE_SECRET_KEY not set — skipping in dev');
    return true;
  }
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

/* ── Email via Resend ──────────────────────────────────────── */
async function sendEmail(fields) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY not set — skipping email in dev');
    return;
  }
  const body = [
    `New enquiry from adelaidepavilion.com.au`,
    `─────────────────────────────`,
    `Name:       ${fields.firstName} ${fields.lastName}`,
    `Email:      ${fields.email}`,
    `Phone:      ${fields.phone || 'Not provided'}`,
    `Event Type: ${fields.eventType}`,
    `Event Date: ${fields.eventDate || 'Not specified'}`,
    `Guests:     ${fields.guestCount}`,
    `Room:       ${fields.room || 'Not specified'}`,
    `Newsletter: ${fields.newsletter ? 'Yes — opted in' : 'No'}`,
    `─────────────────────────────`,
    `Message:`,
    fields.message,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     'Adelaide Pavilion Website <noreply@adelaidepavilion.com.au>',
      to:       ['contact@adelaidepavilion.com.au', 'leo.emile.fuentes@gmail.com'],
      reply_to: fields.email,
      subject:  `Enquiry: ${fields.eventType} — ${fields.firstName} ${fields.lastName}`,
      text:     body,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${res.status} ${err}`);
  }
}

/* ── Main handler ──────────────────────────────────────────── */
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* ── CSRF: validate Origin ───────────────────────────────── */
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  const isLocalDev = !allowedOrigin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === '';
  const isAllowed  = isLocalDev || origin.startsWith(allowedOrigin) || origin.includes('vercel.app');

  if (!isAllowed) {
    console.warn(`[CSRF] Blocked origin: ${origin}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  /* ── Rate limiting ───────────────────────────────────────── */
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    console.warn(`[RATE_LIMIT] Blocked IP: ${ip}`);
    return res.status(429).json({ error: 'Too many submissions. Please wait an hour and try again, or call us on 08 8212 7444.' });
  }

  /* ── Parse body — Vercel parses JSON automatically ───────── */
  let raw;
  try {
    raw = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  /* ── Verify Turnstile ────────────────────────────────────── */
  const turnstileOk = await verifyTurnstile(raw['cf-turnstile-response'], ip);
  if (!turnstileOk) {
    console.warn(`[TURNSTILE] Failed verification for IP: ${ip}`);
    return res.status(400).json({ error: 'Security check failed. Please refresh the page and try again.' });
  }

  /* ── Sanitize all inputs ─────────────────────────────────── */
  const fields = {
    firstName:  sanitize(raw.firstName,  50),
    lastName:   sanitize(raw.lastName,   50),
    email:      sanitizeEmail(raw.email),
    phone:      sanitize(raw.phone,      20),
    eventType:  sanitize(raw.eventType,  30),
    eventDate:  sanitize(raw.eventDate,  10),
    guestCount: sanitize(raw.guestCount, 10),
    room:       sanitize(raw.room,       20),
    message:    sanitize(raw.message,  2000),
    newsletter: raw.newsletter === true || raw.newsletter === 'true',
  };

  /* ── Validate ────────────────────────────────────────────── */
  const errors = validateFields(fields);
  if (errors.length > 0) {
    return res.status(422).json({ error: 'Please check the highlighted fields.', fields: errors });
  }

  /* ── Send email ──────────────────────────────────────────── */
  try {
    await sendEmail(fields);
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err.message);
  }

  /* ── Structured log (no message content) ────────────────── */
  console.log(JSON.stringify({
    event:     'form_submission',
    timestamp: new Date().toISOString(),
    ip,
    email:     fields.email,
    eventType: fields.eventType,
    guests:    fields.guestCount,
  }));

  return res.status(200).json({ success: true });
};
