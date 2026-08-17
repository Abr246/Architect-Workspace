#!/usr/bin/env node
/**
 * Extracts backticked file/script paths from a directive markdown file and
 * reports whether each one resolves on disk, relative to the repo root.
 * No dependencies — deterministic path-existence check, not a narrative one.
 *
 * Usage: node check-references.js <path-to-directive.md>
 */

const fs = require('fs');
const path = require('path');

const directivePath = process.argv[2];

if (!directivePath) {
  console.error('Usage: node check-references.js <path-to-directive.md>');
  process.exit(1);
}

if (!fs.existsSync(directivePath)) {
  console.error(`FAIL: directive file not found: ${directivePath}`);
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const content = fs.readFileSync(directivePath, 'utf8');

// Matches backticked strings that look like a path: contain a "/" or a
// dot-extension, and don't contain whitespace (rules out prose in backticks
// like `npm install` or `success_rate`).
const pathLikePattern = /`([^`\s]+(?:\/[^`\s]+|\.[a-zA-Z0-9]+))`/g;

const candidates = new Set();
let match;
while ((match = pathLikePattern.exec(content)) !== null) {
  candidates.add(match[1]);
}

if (candidates.size === 0) {
  console.log('No path-like backticked references found in this directive.');
  process.exit(0);
}

let failCount = 0;
for (const candidate of candidates) {
  const stripped = candidate.replace(/^\.\//, '');
  const resolved = path.resolve(repoRoot, stripped);
  const exists = fs.existsSync(resolved);
  if (!exists) failCount++;
  console.log(`${exists ? 'PASS' : 'FAIL'}  ${candidate}`);
}

console.log(`\n${candidates.size - failCount}/${candidates.size} referenced paths resolved.`);
process.exit(failCount > 0 ? 1 : 0);
