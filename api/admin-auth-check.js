/**
 * api/admin-auth-check.js — Adelaide Pavilion
 *
 * Checks if user is authenticated via cookie. If yes, serves the admin page.
 * If no, redirects to login. Set ADMIN_PASSWORD in Vercel environment variables.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function makeSessionToken(username, password) {
  return crypto.createHmac('sha256', password).update('admin_session_' + username).digest('hex');
}

module.exports = async function handler(req, res) {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const COOKIE_NAME = 'admin_auth';

  // No credentials configured — deny; ADMIN_USERNAME and ADMIN_PASSWORD must be set in Vercel env vars
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('[admin-auth-check] ADMIN_USERNAME or ADMIN_PASSWORD not set — redirecting to login');
    return res.redirect(302, '/admin-login.html?error=misconfigured');
  }

  const expectedToken = makeSessionToken(ADMIN_USERNAME, ADMIN_PASSWORD);

  // Check for auth cookie
  const cookies = req.headers.cookie || '';
  const cookieMatch = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  if (token === expectedToken) {
    return serveAdminPage(res, expectedToken);
  }

  // Not authenticated — redirect to login
  return res.redirect(302, '/admin-login.html?redirect=/admin/');
};

function serveAdminPage(res, sessionToken) {
  const filePath = path.join(__dirname, '..', 'admin', 'index.html');

  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Inject session token via <meta> tag — avoids inline script execution context
    // Token is HMAC-SHA256 hex ([0-9a-f]{64}) so safe as an attribute value
    const injection = `<meta name="admin-token" content="${sessionToken || ''}">`;
    if (content.includes('</head>')) {
      content = content.replace('</head>', injection + '</head>');
    } else {
      content = content.replace('<body', injection + '<body');
    }
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(content);
  }

  return res.status(404).send('Admin not found');
}
