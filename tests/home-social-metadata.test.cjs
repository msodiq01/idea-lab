const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const home = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('home page has theme color and social share metadata', () => {
  assert.match(home, /name="theme-color" content="#07111f"/);
  assert.match(home, /property="og:type" content="website"/);
  assert.match(home, /property="og:title"/);
  assert.match(home, /property="og:description"/);
  assert.match(home, /name="twitter:card" content="summary"/);
});
