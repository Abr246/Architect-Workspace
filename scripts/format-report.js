#!/usr/bin/env node
// Reformats a generated project-update report for readability: consistent
// heading spacing, consistent bullet markers, no stray blank lines, one
// trailing newline. No external dependency — this repo has no formatter
// installed today (see .claude/commands/ship.md).

'use strict';

const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  console.error('format-report: no file path given');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  // Nothing to format (file was deleted, or the path was never valid).
  process.exit(0);
}

let text = fs.readFileSync(filePath, 'utf8');

// Normalize line endings.
text = text.replace(/\r\n/g, '\n');

// Trim trailing whitespace on every line.
text = text
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/, ''))
  .join('\n');

// Normalize "*"/"+" bullet markers to "-" so the whole report reads as one style.
text = text
  .split('\n')
  .map((line) => line.replace(/^(\s*)[*+](\s+)/, '$1-$2'))
  .join('\n');

// Ensure exactly one blank line before and after every heading.
const lines = text.split('\n');
const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const isHeading = /^#{1,6}\s/.test(line);
  if (isHeading && out.length && out[out.length - 1].trim() !== '') {
    out.push('');
  }
  out.push(line);
  const next = lines[i + 1];
  if (isHeading && next !== undefined && next.trim() !== '') {
    out.push('');
  }
}
text = out.join('\n');

// Collapse 3+ consecutive blank lines down to exactly 1.
text = text.replace(/\n{3,}/g, '\n\n');

// Exactly one trailing newline.
text = text.replace(/\s+$/, '') + '\n';

fs.writeFileSync(filePath, text, 'utf8');
console.log('format-report: formatted ' + filePath);
