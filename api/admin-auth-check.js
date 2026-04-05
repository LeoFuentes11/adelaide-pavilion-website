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

function makeSessionToken(password) {
  return crypto.createHmac('sha256', password).update('admin_session').digest('hex');
}

module.exports = async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
  const COOKIE_NAME = 'admin_auth';

  // No password configured — serve admin directly
  if (!ADMIN_PASSWORD) {
    return serveAdminPage(res, 'no_password_configured');
  }

  const expectedToken = makeSessionToken(ADMIN_PASSWORD);

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
    // Inject session token so admin panel can authenticate API calls via header
    const tokenJson = JSON.stringify(sessionToken || '');
    const injection = `<script>window.__adminToken=${tokenJson};</script>`;
    if (content.includes('</head>')) {
      content = content.replace('</head>', injection + '</head>');
    } else {
      // Fallback: prepend to body
      content = content.replace('<body', injection + '<body');
    }
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(content);
  }

  return res.status(404).send('Admin not found');
}
