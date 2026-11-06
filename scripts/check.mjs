#!/usr/bin/env node
/**
 * Self-check for this bundle. No dependencies, no network.
 *
 * Verifies that the three places naming the package agree — `package.json`,
 * the inserted patch row, and the Client module id — because a mismatch shows up
 * only at runtime, as a bundle that installs and never loads.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (message) => problems.push(message);
const read = (relative) => readFileSync(join(root, relative), 'utf8');
const exists = (relative) => {
  try {
    statSync(join(root, relative));
    return true;
  } catch {
    return false;
  }
};

// 1. syntax of both halves
for (const file of ['index.js', 'client.js']) {
  if (!exists(file)) {
    fail(`missing file: ${file}`);
    continue;
  }
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file}: ${String(error.stderr || error.message).trim()}`);
  }
}

// 2. manifest
let pkg = null;
try {
  pkg = JSON.parse(read('package.json'));
} catch (error) {
  fail(`package.json: ${error.message}`);
}
if (pkg) {
  if (!pkg.name) fail('package.json: missing "name"');
  if (!pkg.version) fail('package.json: missing "version"');
  if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) fail('package.json: missing dsh.bundle.patch');
  if (!pkg.dsh || !pkg.dsh.client || pkg.dsh.client.platform !== 'web') {
    fail('package.json: dsh.client.platform must be "web"');
  }
  for (const file of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']) {
    if (!exists(file)) fail(`missing file: ${file}`);
  }
  for (const [key, value] of Object.entries(pkg.exports || {})) {
    if (typeof value !== 'string' || value.includes('*')) continue;
    if (!exists(value)) fail(`exports["${key}"] points at a missing file: ${value}`);
  }
  for (const pattern of pkg.files || []) {
    if (pattern.includes('*')) continue;
    if (!exists(pattern)) fail(`files[] lists a missing file: ${pattern}`);
  }

  // 3. the package name must appear in the patch row and the Client module id
  if (pkg.name) {
    const patch = exists('cordis.patch.yml') ? read('cordis.patch.yml') : '';
    if (!patch.includes(`'${pkg.name}'`) && !patch.includes(`"${pkg.name}"`)) {
      fail(`cordis.patch.yml: no row named "${pkg.name}"`);
    }
    const client = exists('client.js') ? read('client.js') : '';
    if (!client.includes(`id: '${pkg.name}'`)) {
      fail(`client.js: the Client module id must equal the package name ("${pkg.name}")`);
    }
  }
}

// 4. locales carry the Plugin Manager metadata
for (const locale of ['en', 'zh']) {
  const file = `locale/${locale}.json`;
  if (!exists(file)) {
    fail(`missing file: ${file}`);
    continue;
  }
  let dict = null;
  try {
    dict = JSON.parse(read(file));
  } catch (error) {
    fail(`${file}: ${error.message}`);
    continue;
  }
  if (!dict.meta || !dict.meta.title) fail(`${file}: meta.title missing`);
  if (!dict.meta || !dict.meta.description) fail(`${file}: meta.description missing`);
}

// 5. icon
if (exists('icon.svg')) {
  const icon = read('icon.svg');
  if (!icon.trimStart().startsWith('<svg')) fail('icon.svg: not an SVG document');
  if (Buffer.byteLength(icon) > 256 * 1024) fail('icon.svg: above the 256 KiB limit');
}

if (problems.length > 0) {
  console.error('check failed:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('check ok - syntax, manifest, patch row, client id, locales, icon');
