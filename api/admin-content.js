/**
 * api/admin-content.js — Adelaide Pavilion
 *
 * Authenticated GET endpoint — returns the content of a _data/*.json file.
 * Requires valid admin_auth cookie (HMAC session token).
 *
 * GET /api/admin-content?file=homepage
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_FILES = [
  'contact', 'homepage', 'about', 'weddings', 'corporate', 'social', 'packages', 'menus'
];

function makeSessionToken(password) {
  return crypto.createHmac('sha256', password).update('admin_session').digest('hex');
}

function isAuthenticated(req) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
  if (!ADMIN_PASSWORD) return true; // no password set — open
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_auth=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  return token === makeSessionToken(ADMIN_PASSWORD);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const file = req.query.file;
  if (!file || !ALLOWED_FILES.includes(file)) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const filePath = path.join(__dirname, '..', '_data', `${file}.json`);

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error(`[admin-content] Failed to read ${file}.json:`, err.message);
    return res.status(500).json({ error: 'Failed to read content' });
  }
};
