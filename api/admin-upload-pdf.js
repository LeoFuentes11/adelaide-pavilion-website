/**
 * api/admin-upload-pdf.js — Adelaide Pavilion (Vercel / site-trial)
 * POST /api/admin-upload-pdf
 * Body: { slot: 'wedding'|'corporate'|'social', data: base64 }
 *
 * Vercel's filesystem is read-only so we commit the PDF directly to
 * GitHub via the Contents API (same pattern as admin-save.js).
 *
 * Required env vars (same as admin-save.js):
 *   ADMIN_PASSWORD   — admin cookie secret
 *   ADMIN_USERNAME   — admin username
 *   GITHUB_TOKEN     — personal access token with repo write scope
 *   GITHUB_REPO      — "owner/repo-name"
 *   GITHUB_BRANCH    — branch to commit to (default: "master")
 */

'use strict';

const crypto = require('crypto');

const ALLOWED_SLOTS = new Set(['wedding', 'corporate', 'social']);
const MAX_BYTES     = 20 * 1024 * 1024; // 20 MB

function makeSessionToken(username, password) {
  return crypto.createHmac('sha256', password).update('admin_session_' + username).digest('hex');
}

function isAuthenticated(req) {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return false;
  const expected = makeSessionToken(ADMIN_USERNAME, ADMIN_PASSWORD);
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === expected) return true;
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_auth=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  return token === expected;
}

async function commitToGitHub(slot, buffer) {
  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';

  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN / GITHUB_REPO not configured.');
  }

  const filename = `${slot}-packages.pdf`;
  const apiPath  = `_docs/${filename}`;
  const apiBase  = `https://api.github.com/repos/${repo}/contents/${apiPath}`;
  const headers  = {
    'Authorization':        `Bearer ${token}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent':           'Adelaide-Pavilion-Admin'
  };

  // Get current SHA so GitHub lets us overwrite the file if it already exists
  let sha;
  const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    const err = await getRes.text();
    throw new Error(`GitHub GET failed (${getRes.status}): ${err}`);
  }

  const encodedContent = buffer.toString('base64');

  const body = {
    message: `content: update ${filename} via admin panel`,
    content: encodedContent,
    branch
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiBase, {
    method:  'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub PUT failed (${putRes.status}): ${err}`);
  }

  return filename;
}

module.exports = async function adminUploadPdf(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slot, data } = req.body || {};

  if (!slot || !ALLOWED_SLOTS.has(slot)) {
    return res.status(400).json({ error: 'Invalid slot. Must be wedding, corporate, or social.' });
  }
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Missing PDF data.' });
  }

  let buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 data.' });
  }

  if (buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: 'File too large (max 20 MB).' });
  }

  // Verify PDF magic bytes %PDF
  if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
    return res.status(400).json({ error: 'File does not appear to be a valid PDF.' });
  }

  try {
    const filename = await commitToGitHub(slot, buffer);
    return res.status(200).json({
      ok:       true,
      slot,
      filename,
      path:     `_docs/${filename}`,
      sizeKb:   Math.round(buffer.length / 1024),
      updated:  new Date().toISOString()
    });
  } catch (err) {
    console.error('[admin-upload-pdf] Error:', err.message);
    return res.status(500).json({ error: 'Failed to save PDF: ' + err.message });
  }
};
