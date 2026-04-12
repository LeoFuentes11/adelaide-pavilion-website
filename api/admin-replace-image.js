/**
 * api/admin-replace-image.js — Adelaide Pavilion
 *
 * Authenticated POST endpoint — replaces a named image slot via GitHub Contents API
 * and updates _data/images.json with the new path.
 *
 * POST /api/admin-replace-image
 * Body: { slot: string, name: string, type: string, data: string (base64) }
 *
 * Required env vars:
 *   ADMIN_PASSWORD   — admin cookie secret
 *   GITHUB_TOKEN     — personal access token with repo write scope
 *   GITHUB_REPO      — "owner/repo-name"
 *   GITHUB_BRANCH    — branch to commit to (default: "master")
 */

'use strict';

const crypto = require('crypto');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB decoded

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

function sanitizeSlot(slot) {
  // Only allow word chars and underscores — no path traversal possible
  return /^[a-zA-Z0-9_]+$/.test(slot);
}

const GITHUB_API = 'https://api.github.com';

function githubHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Adelaide-Pavilion-Admin'
  };
}

async function putGitHubFile(token, repo, branch, path, base64Content, message, sha) {
  const body = { message, content: base64Content, branch };
  if (sha) body.sha = sha;
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT ${path} failed (${res.status}): ${err}`);
  }
  return res.json();
}

async function getImagesJson(token, repo, branch) {
  const url = `${GITHUB_API}/repos/${repo}/contents/_data/images.json?ref=${branch}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) throw new Error(`GitHub GET images.json failed (${res.status})`);
  const json = await res.json();
  const content = Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: json.sha };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slot, name, type, data } = req.body || {};

  // Validate slot
  if (!slot || typeof slot !== 'string' || !sanitizeSlot(slot)) {
    return res.status(400).json({ error: 'Invalid slot name' });
  }
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing file name' });
  }
  if (!type || !ALLOWED_TYPES.includes(type.toLowerCase())) {
    return res.status(400).json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF.' });
  }
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Missing image data' });
  }

  // Validate size
  let imageBuffer;
  try {
    imageBuffer = Buffer.from(data, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 data' });
  }
  if (imageBuffer.length > MAX_BYTES) {
    return res.status(400).json({ error: 'File too large (max 4 MB). Please compress the image before uploading.' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';

  if (!token || !repo) {
    return res.status(500).json({ error: 'GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO env vars.' });
  }

  try {
    // Load images.json first — verify slot exists
    const { data: images, sha: imagesSHA } = await getImagesJson(token, repo, branch);
    if (!Object.prototype.hasOwnProperty.call(images, slot)) {
      return res.status(400).json({ error: `Unknown slot: ${slot}` });
    }

    // Build filename: images/managed/{timestamp}-{slot}.{ext}
    const ext = ALLOWED_EXTENSIONS[type.toLowerCase()] || 'jpg';
    const ts = Date.now();
    const imagePath = `images/managed/${ts}-${slot}.${ext}`;
    const imageSrc = imagePath;

    // Upload image to GitHub
    await putGitHubFile(
      token, repo, branch,
      imagePath,
      data,
      `feat: replace image slot ${slot}`
    );

    // Update images.json — preserve existing label
    images[slot] = { src: imageSrc, label: images[slot].label };
    const updatedJson = JSON.stringify(images, null, 2) + '\n';
    await putGitHubFile(
      token, repo, branch,
      '_data/images.json',
      Buffer.from(updatedJson, 'utf8').toString('base64'),
      `content: update image slot ${slot}`,
      imagesSHA
    );

    return res.status(200).json({ ok: true, slot, src: imageSrc });

  } catch (err) {
    console.error('[admin-replace-image]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
