/**
 * api/admin-auth-check.js — Adelaide Pavilion
 *
 * Checks if user is authenticated via cookie. If yes, serves the admin page.
 * If no, redirects to login. Set ADMIN_PASSWORD in Vercel environment variables.
 */

'use strict';

const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
  const COOKIE_NAME = 'admin_auth';
  const origin = req.headers.origin || 'https://adelaide-pavilion-website.vercel.app';

  // No password configured — serve admin directly
  if (!ADMIN_PASSWORD) {
    return serveAdminPage(res, origin);
  }

  // Check for auth cookie
  const cookies = req.headers.cookie || '';
  const cookieMatch = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  if (token === ADMIN_PASSWORD) {
    return serveAdminPage(res, origin);
  }

  // Not authenticated — redirect to login
  return res.redirect(new URL(`/admin-login.html?redirect=/admin/`, origin).toString());
};

function serveAdminPage(res, origin) {
  const adminIndexPath = path.join(process.cwd(), 'admin', 'index.html');
  
  // For Vercel serverless, we need to read from __dirname or similar
  // Since this is in api/ folder, go up one level
  const filePath = path.join(__dirname, '..', 'admin', 'index.html');
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    return res.send(content);
  }
  
  return res.status(404).send('Admin not found');
}