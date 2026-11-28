const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const home = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('home page exposes a visible keyboard focus indicator', () => {
  assert.match(home, /:focus-visible/);
  assert.match(home, /outline:\s*3px solid/);
  assert.match(home, /outline-offset:\s*3px/);
});

test('home page respects reduced-motion preferences', () => {
  assert.match(home, /prefers-reduced-motion:\s*reduce/);
  assert.match(home, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(home, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(home, /scroll-behavior:\s*auto\s*!important/);
});
