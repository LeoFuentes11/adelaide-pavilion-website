/**
 * migrate-to-sanity.js — Adelaide Pavilion
 *
 * Migrates content from JSON files to Sanity.
 * Run: node migrate-to-sanity.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

const PROJECT_ID = 'bt9gto0j';
const client = createClient({
  projectId: PROJECT_ID,
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const DATA_DIR = path.join(__dirname, '..', '_data');

async function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function uploadDocument(type, data) {
  try {
    const doc = { _type: type, ...data };
    const result = await client.create(doc);
    console.log(`✓ Created ${type}: ${result._id}`);
    return result;
  } catch (e) {
    console.error(`✗ Failed to create ${type}:`, e.message);
    return null;
  }
}

async function migrate() {
  console.log('Starting migration to Sanity...\n');

  const pages = ['homepage', 'about', 'weddings', 'corporate', 'social', 'packages', 'menus', 'contact'];
  for (const page of pages) {
    const data = await readJSON(`${page}.json`);
    if (data) await uploadDocument(page, data);
  }

  console.log('\n✓ Migration complete!');
}

migrate().catch(console.error);