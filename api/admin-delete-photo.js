/**
 * api/admin-delete-photo.js — Adelaide Pavilion
 *
 * Authenticated POST endpoint — removes a photo entry from _data/gallery.json
 * and deletes the file from GitHub if it lives in images/gallery/.
 *
 * POST /api/admin-delete-photo
 * Body: { src: "images/gallery/filename.jpg" }
 *
 * Required env vars: ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH
 */

'use strict';

const crypto = require('crypto');

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

const GITHUB_API = 'https://api.github.com';

function githubHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Adelaide-Pavilion-Admin'
  };
}

async function getGalleryJson(token, repo, branch) {
  const url = `${GITHUB_API}/repos/${repo}/contents/_data/gallery.json?ref=${branch}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) throw new Error(`GitHub GET gallery.json failed (${res.status})`);
  const json = await res.json();
  const content = Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: json.sha };
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
}

async function deleteGitHubFile(token, repo, branch, path, message) {
  // Get current SHA first
  const getRes = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`, {
    headers: githubHeaders(token)
  });
  if (getRes.status === 404) return; // already gone
  if (!getRes.ok) throw new Error(`GitHub GET ${path} failed (${getRes.status})`);
  const { sha } = await getRes.json();

  const delRes = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'DELETE',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch })
  });
  if (!delRes.ok) {
    const err = await delRes.text();
    throw new Error(`GitHub DELETE ${path} failed (${delRes.status}): ${err}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { src } = req.body || {};

  if (!src || typeof src !== 'string') {
    return res.status(400).json({ error: 'Missing src parameter' });
  }

  // Prevent path traversal
  if (src.includes('..') || src.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid src path' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';

  if (!token || !repo) {
    return res.status(500).json({ error: 'GitHub not configured' });
  }

  try {
    // Remove entry from gallery.json
    const { data: gallery, sha: gallerySHA } = await getGalleryJson(token, repo, branch);
    const filtered = gallery.filter(item => item.src !== src);

    if (filtered.length === gallery.length) {
      return res.status(404).json({ error: 'Photo not found in gallery' });
    }

    const updatedJson = JSON.stringify(filtered, null, 2) + '\n';
    await putGitHubFile(
      token, repo, branch,
      '_data/gallery.json',
      Buffer.from(updatedJson, 'utf8').toString('base64'),
      `content: remove gallery photo ${src.split('/').pop()}`,
      gallerySHA
    );

    // Only delete the actual file if it's an uploaded gallery image (not original site images)
    if (src.startsWith('images/gallery/')) {
      await deleteGitHubFile(
        token, repo, branch,
        src,
        `chore: delete gallery photo ${src.split('/').pop()}`
      );
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[admin-delete-photo]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
