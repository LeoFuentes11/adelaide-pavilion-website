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
  const origin = req.headers.origin || 'https://adelaide-pavilion-website.vercel.app';

  // No password configured — serve admin directly
  if (!ADMIN_PASSWORD) {
    return serveAdminPage(res);
  }

  // Check for auth cookie
  const cookies = req.headers.cookie || '';
  const cookieMatch = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  if (token === makeSessionToken(ADMIN_PASSWORD)) {
    return serveAdminPage(res);
  }

  // Not authenticated — redirect to login
  return res.redirect('/admin-login.html?redirect=/admin/');
};

function serveAdminPage(res) {
  const filePath = path.join(__dirname, '..', 'admin', 'index.html');
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    return res.send(content);
  }
  
  return res.status(404).send('Admin not found');
}
