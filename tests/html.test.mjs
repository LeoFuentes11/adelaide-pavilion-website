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
  w.includes('href="packages.html#pkg-wedding-signature"'),
  'Signature card links to #pkg-wedding-signature'
);
assert(
  w.includes('href="packages.html#pkg-wedding-pavilion"'),
  'Pavilion card links to #pkg-wedding-pavilion'
);
assert(
  w.includes('href="packages.html#pkg-wedding-cocktail"'),
  'Cocktail Celebration card links to #pkg-wedding-cocktail'
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
  s.includes('href="packages.html#pkg-social-banquet-1"'),
  'Banquet 1 card links to #pkg-social-banquet-1'
);
assert(
  s.includes('href="packages.html#pkg-social-banquet-2"'),
  'Banquet 2 card links to #pkg-social-banquet-2'
);
assert(
  s.includes('href="packages.html#pkg-social-banquet-3"'),
  'Banquet 3 card links to #pkg-social-banquet-3'
);
assert(
  s.includes('href="packages.html#pkg-social-banquet-4"'),
  'Banquet 4 card links to #pkg-social-banquet-4'
);
assert(
  s.includes('href="packages.html#pkg-social-cocktail"'),
  'Cocktail Celebration card links to #pkg-social-cocktail'
);
assert(
  s.includes('href="packages.html#pkg-social-street-eats"'),
  'Street Eats card links to #pkg-social-street-eats'
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
  c.includes('href="packages.html#pkg-corporate-breakfast"'),
  'Breakfast tile links to #pkg-corporate-breakfast'
);
assert(
  c.includes('href="packages.html#pkg-corporate-fullday"'),
  'Full Day tile links to #pkg-corporate-fullday'
);
assert(
  c.includes('href="packages.html#pkg-corporate-networking"'),
  'Networking tile links to #pkg-corporate-networking'
);
assert(
  c.includes('href="packages.html#pkg-corporate-evening"'),
  'Evening tile links to #pkg-corporate-evening'
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

// ── packages.html (deep-link IDs) ────────────────────────────────────────────
console.log('\npackages.html');
const p = read('packages.html');

assert(p.includes('id="pkg-wedding-signature"'), 'wedding Signature has deep-link ID');
assert(p.includes('id="pkg-wedding-pavilion"'), 'wedding Pavilion has deep-link ID');
assert(p.includes('id="pkg-wedding-cocktail"'), 'wedding Cocktail has deep-link ID');
assert(p.includes('id="pkg-social-banquet-1"'), 'social banquet-1 has deep-link ID');
assert(p.includes('id="pkg-social-banquet-2"'), 'social banquet-2 has deep-link ID');
assert(p.includes('id="pkg-social-banquet-3"'), 'social banquet-3 has deep-link ID');
assert(p.includes('id="pkg-social-banquet-4"'), 'social banquet-4 has deep-link ID');
assert(p.includes('id="pkg-social-cocktail"'), 'social cocktail has deep-link ID');
assert(p.includes('id="pkg-social-street-eats"'), 'social street-eats has deep-link ID');
assert(p.includes('id="pkg-corporate-breakfast"'), 'corporate breakfast has deep-link ID');
assert(p.includes('id="pkg-corporate-fullday"'), 'corporate fullday has deep-link ID');
assert(p.includes('id="pkg-corporate-networking"'), 'corporate networking has deep-link ID');
assert(p.includes('id="pkg-corporate-evening"'), 'corporate evening has deep-link ID');

// ── main.js (hash handler) ───────────────────────────────────────────────────
console.log('\nmain.js');
const js = read('js/main.js');

assert(
  js.includes('closest(\'[data-tab-content]\')'),
  'main.js hash handler supports element-level anchors within tabs'
);
assert(
  js.includes('requestAnimationFrame'),
  'main.js uses requestAnimationFrame for post-tab-switch scroll'
);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
