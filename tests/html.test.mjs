// HTML integrity tests for Adelaide Pavilion static site
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

// ── weddings.html ────────────────────────────────────────────────────────────
console.log('\nweddings.html');
const w = read('weddings.html');

assert(
  (w.match(/class="pkg-footer"/g) || []).length === 3,
  'has 3 pkg-footer elements (one per card)'
);
assert(
  (w.match(/wedding-packages\.pdf/g) || []).length === 1,
  'wedding-packages.pdf appears exactly once (bottom CTA only, not in cards)'
);
assert(
  (w.match(/href="packages\.html#weddings"/g) || []).length >= 3,
  'each card links to packages.html#weddings'
);
assert(
  w.includes('View Package') && !w.includes('>View Packages<'),
  'button text is "View Package" (singular)'
);
assert(
  w.includes('_docs/wedding-packages.pdf" class="btn btn-gold"'),
  'Download PDF present in bottom CTA as btn-gold'
);
assert(
  w.includes('View Full Packages with Complete Menus'),
  'bottom CTA "View Full Packages" button present'
);

// ── social.html ──────────────────────────────────────────────────────────────
console.log('\nsocial.html');
const s = read('social.html');

assert(
  (s.match(/class="pkg-footer"/g) || []).length === 6,
  'has 6 pkg-footer elements (one per card)'
);
assert(
  !s.includes('_docs/social-packages.pdf" class="btn btn-green"') &&
  !s.includes('_docs/social-packages.pdf" class="btn btn-gold" style="flex'),
  'no Download PDF inside individual pkg-footer cards'
);
assert(
  (s.match(/href="packages\.html#social" class="btn btn-outline-green"/g) || []).length === 6,
  'each of 6 cards links to packages.html#social'
);
assert(
  s.includes('href="packages.html#social" class="btn btn-green"'),
  'bottom CTA "View Full Menus" links to packages.html#social (not PDF)'
);
assert(
  s.includes('_docs/social-packages.pdf" class="btn btn-gold"'),
  'Download PDF present in bottom CTA as btn-gold'
);

// ── corporate.html ───────────────────────────────────────────────────────────
console.log('\ncorporate.html');
const c = read('corporate.html');

assert(
  !c.includes('Get the Full Details'),
  '"Get the Full Details" box removed'
);
assert(
  !c.includes('Download Our Corporate Packages PDF'),
  'green PDF CTA heading removed'
);
assert(
  (c.match(/href="packages\.html#corporate" class="btn btn-outline-green"/g) || []).length === 4,
  '4 View Package buttons each linking to packages.html#corporate'
);
assert(
  c.includes('display:flex;flex-direction:column;'),
  'tiles use flex-column for alignment'
);
assert(
  c.includes('margin-top:auto;'),
  'View Package button uses margin-top:auto to align to tile bottom'
);
assert(
  c.includes('View Full Corporate Packages with Complete Menus'),
  'bottom CTA "View Full Corporate Packages" button present'
);
assert(
  c.includes('_docs/corporate-packages.pdf" class="btn btn-gold"'),
  'Download PDF present in bottom CTA as btn-gold'
);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
