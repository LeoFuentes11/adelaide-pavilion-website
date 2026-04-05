/**
 * api/admin-save.js — Adelaide Pavilion
 *
 * Authenticated POST endpoint — saves updated _data/*.json content.
 * Writes locally (for dev) and commits to GitHub via Contents API (for production).
 *
 * POST /api/admin-save
 * Body: { file: "homepage", data: { ... } }
 *
 * Required env vars:
 *   ADMIN_PASSWORD    — admin cookie secret
 *   GITHUB_TOKEN      — personal access token with repo write scope
 *   GITHUB_REPO       — "owner/repo-name"
 *   GITHUB_BRANCH     — branch to commit to (default: "master")
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
  if (!ADMIN_PASSWORD) return true;
  const expected = makeSessionToken(ADMIN_PASSWORD);
  // Accept token via Authorization header (primary) or cookie (fallback)
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === expected) return true;
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_auth=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  return token === expected;
}

async function commitToGitHub(file, content) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';

  if (!token || !repo) {
    console.warn('[admin-save] GITHUB_TOKEN/GITHUB_REPO not set — skipping GitHub commit');
    return;
  }

  const apiPath = `_data/${file}.json`;
  const apiBase = `https://api.github.com/repos/${repo}/contents/${apiPath}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Adelaide-Pavilion-Admin'
  };

  // Get current SHA (needed for update)
  let sha;
  const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    const err = await getRes.text();
    throw new Error(`GitHub GET failed (${getRes.status}): ${err}`);
  }

  const encodedContent = Buffer.from(content, 'utf8').toString('base64');

  const body = {
    message: `content: update ${file}.json via admin panel`,
    content: encodedContent,
    branch
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub PUT failed (${putRes.status}): ${err}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { file, data } = req.body || {};

  if (!file || !ALLOWED_FILES.includes(file)) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: 'Invalid data payload' });
  }

  const jsonContent = JSON.stringify(data, null, 2) + '\n';

  // Try local write (works in dev; Vercel filesystem is read-only so this will fail there — that's OK)
  const filePath = path.join(__dirname, '..', '_data', `${file}.json`);
  try {
    fs.writeFileSync(filePath, jsonContent, 'utf8');
  } catch (err) {
    console.warn(`[admin-save] Local write skipped (read-only filesystem): ${err.message}`);
  }

  // Commit to GitHub — this is the production persistence mechanism
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.warn('[admin-save] GITHUB_TOKEN/GITHUB_REPO not set — changes will not persist after redeploy');
    return res.status(200).json({
      ok: true,
      warning: 'GitHub not configured. Changes saved locally only and will not persist after redeploy.'
    });
  }

  try {
    await commitToGitHub(file, jsonContent);
  } catch (err) {
    console.error('[admin-save] GitHub commit failed:', err.message);
    return res.status(500).json({ error: 'Failed to save content: ' + err.message });
  }

  return res.status(200).json({ ok: true });
};
