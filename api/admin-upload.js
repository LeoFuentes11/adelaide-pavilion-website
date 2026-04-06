/**
 * api/admin-upload.js — Adelaide Pavilion
 *
 * Authenticated POST endpoint — uploads a photo to the repo via GitHub Contents API
 * and appends an entry to _data/gallery.json.
 *
 * POST /api/admin-upload
 * Body: { name: string, type: string, data: string (base64), alt: string, caption: string }
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
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (after decompression)

function makeSessionToken(password) {
  return crypto.createHmac('sha256', password).update('admin_session').digest('hex');
}

function isAuthenticated(req) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) return false;
  const expected = makeSessionToken(ADMIN_PASSWORD);
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === expected) return true;
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_auth=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  return token === expected;
}

function sanitizeFilename(name) {
  // Keep only safe characters, replace spaces with dashes
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
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

async function getFileSHA(token, repo, branch, path) {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} failed (${res.status})`);
  const json = await res.json();
  return json.sha || null;
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

async function getGalleryJson(token, repo, branch) {
  const url = `${GITHUB_API}/repos/${repo}/contents/_data/gallery.json?ref=${branch}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) throw new Error(`GitHub GET gallery.json failed (${res.status})`);
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

  const { name, type, data, alt, caption } = req.body || {};

  // Validate inputs
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing file name' });
  }
  if (!type || !ALLOWED_TYPES.includes(type.toLowerCase())) {
    return res.status(400).json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF.' });
  }
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Missing image data' });
  }

  // Validate base64 and size
  let imageBuffer;
  try {
    imageBuffer = Buffer.from(data, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 data' });
  }
  if (imageBuffer.length > MAX_BYTES) {
    return res.status(400).json({ error: `File too large (max 4 MB). Please compress the image before uploading.` });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';

  if (!token || !repo) {
    return res.status(500).json({ error: 'GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO env vars.' });
  }

  // Build safe filename with timestamp prefix to avoid collisions
  const ext = ALLOWED_EXTENSIONS[type.toLowerCase()] || 'jpg';
  const ts = Date.now();
  const safeName = sanitizeFilename(name.replace(/\.[^.]+$/, '')); // strip original extension
  const filename = `${ts}-${safeName}.${ext}`;
  const imagePath = `images/gallery/${filename}`;
  const imageSrc = `images/gallery/${filename}`;

  try {
    // Upload image file to GitHub
    await putGitHubFile(
      token, repo, branch,
      imagePath,
      data, // already base64
      `feat: upload gallery photo ${filename}`
    );

    // Update gallery.json
    const { data: gallery, sha: gallerySHA } = await getGalleryJson(token, repo, branch);
    const entry = {
      src: imageSrc,
      alt: (alt || '').trim() || 'Adelaide Pavilion event photo',
      caption: (caption || '').trim() || ''
    };
    gallery.push(entry);

    const updatedJson = JSON.stringify(gallery, null, 2) + '\n';
    await putGitHubFile(
      token, repo, branch,
      '_data/gallery.json',
      Buffer.from(updatedJson, 'utf8').toString('base64'),
      `content: add gallery photo ${filename}`,
      gallerySHA
    );

    return res.status(200).json({ ok: true, src: imageSrc, entry });

  } catch (err) {
    console.error('[admin-upload]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
