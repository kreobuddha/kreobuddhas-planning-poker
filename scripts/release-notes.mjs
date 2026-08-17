// Prints the changelog section for one version, so the GitHub release says the same thing the
// changelog does. Two hand-written descriptions of one release drift apart.
//
// Usage: node scripts/release-notes.mjs 0.1.0

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const CHANGELOG = 'CHANGELOG.md';
const REPO = 'https://github.com/kreobuddha/kreobuddhas-planning-poker';

const version = process.argv[2];

if (!version) {
  process.stderr.write('Usage: node scripts/release-notes.mjs <version>\n');
  process.exit(1);
}

const changelog = await readFile(CHANGELOG, 'utf8');

// Sections are `## [x.y.z] — date`; the body runs to the next `## ` heading.
const heading = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*$`, 'm');
const start = heading.exec(changelog);

if (!start) {
  process.stderr.write(`No section for ${version} in ${CHANGELOG}\n`);
  process.exit(1);
}

const after = changelog.slice(start.index + start[0].length);
const end = /^## /m.exec(after);
const body = after.slice(0, end ? end.index : undefined).trim();

if (!body) {
  process.stderr.write(`The section for ${version} is empty\n`);
  process.exit(1);
}

// The previous version is whichever released section comes next, so the comparison link points at
// the real predecessor rather than at whatever the last release happened to be.
const previous = /^## \[(\d+\.\d+\.\d+)\]/m.exec(after);

const compare = previous
  ? `${REPO}/compare/v${previous[1]}...v${version}`
  : `${REPO}/releases/tag/v${version}`;

process.stdout.write(`${body}\n\n**Full changelog**: ${compare}\n`);
