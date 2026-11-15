# IDEA LAB — Read-only data diagnostics (20 checks)

Date: 2026-11-15
Branch: feature/read-only-data-diagnostics-20

## Purpose
This module prepares legacy browser data for a later, explicitly approved migration. It is read-only: it never writes, deletes, repairs, migrates, uploads, or transmits data. It reports aggregate counts and allowlisted storage-key names, not record values or contact details.

## 20 diagnostic checks
1. Storage API availability.
2. Allowlisted legacy key scope.
3. Missing legacy keys.
4. Storage read failures.
5. JSON parse integrity.
6. Null root values.
7. Empty arrays.
8. Empty root objects.
9. Unexpected root value types.
10. Non-object members inside collections.
11. Missing record IDs.
12. Duplicate record IDs.
13. Empty object records.
14. Large individual records (>100 KB).
15. Large storage entries (>1 MB).
16. Total dataset size (>5 MB).
17. Total collection record count.
18. Parsed-key and found-key counts.
19. Unknown requested keys are ignored and reported.
20. Read-only guarantee and privacy-safe inventory (no record payloads).

## Use
Load `assets/idea-data-audit.js` in a browser after the page is ready, then call:

```js
const report = window.IDEALAB_DATA_AUDIT.audit();
console.table(report.summary);
console.table(report.findings);
```

The result is local to the current browser. It is not a server report and does not prove that records are correct or owned by the signed-in person. Do not run a migration based only on this report. Back up data and verify identity mapping, schema compatibility, access policies, and rollback before any import.

## Tests
Run `node --test tests/*.test.cjs`. The new file has 24 isolated tests. Automated tests are not a substitute for real-browser testing.
