const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'tests.yml'), 'utf8');

test('test workflow uses read-only repository permissions', () => {
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
});

test('test workflow cancels superseded runs in the same group', () => {
  assert.match(workflow, /concurrency:\s*\n\s+group:\s+idea-lab-tests-/);
  assert.match(workflow, /cancel-in-progress:\s*true/);
});
