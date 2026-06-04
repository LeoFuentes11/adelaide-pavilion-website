/**
 * api/admin-delete-pdf.js — Adelaide Pavilion (Vercel / site-trial)
 * POST /api/admin-delete-pdf
 * Body: { slot: 'wedding'|'corporate'|'social' }
 *
 * Deletes the corresponding PDF from GitHub via the Contents API.
 */

'use strict';

const crypto = require('crypto');

const ALLOWED_SLOTS = new Set(['wedding', 'corporate', 'social']);

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

module.exports = async function adminDeletePdf(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slot } = req.body || {};

  if (!slot || !ALLOWED_SLOTS.has(slot)) {
    return res.status(400).json({ error: 'Invalid slot. Must be wedding, corporate, or social.' });
  }

  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';

  if (!token || !repo) {
    return res.status(500).json({ error: 'GITHUB_TOKEN / GITHUB_REPO not configured.' });
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

  // Must GET the file first to retrieve its SHA (required by GitHub DELETE)
  let sha;
  try {
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (getRes.status === 404) {
      return res.status(404).json({ error: 'File not found — nothing to delete.' });
    }
    if (!getRes.ok) {
      const err = await getRes.text();
      throw new Error(`GitHub GET failed (${getRes.status}): ${err}`);
    }
    const data = await getRes.json();
    sha = data.sha;
  } catch (err) {
    console.error('[admin-delete-pdf] GET error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve file info: ' + err.message });
  }

  // Delete the file
  try {
    const delRes = await fetch(apiBase, {
      method:  'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        message: `content: remove ${filename} via admin panel`,
        sha,
        branch
      })
    });

    if (!delRes.ok) {
      const err = await delRes.text();
      throw new Error(`GitHub DELETE failed (${delRes.status}): ${err}`);
    }
  } catch (err) {
    console.error('[admin-delete-pdf] DELETE error:', err.message);
    return res.status(500).json({ error: 'Failed to delete file: ' + err.message });
  }

  return res.status(200).json({ ok: true, slot, filename });
};
