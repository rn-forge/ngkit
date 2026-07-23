#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = process.cwd();
const packages = ['ng', 'ng-bootstrap'];

/** @type {string[]} */
const errors = [];

function checkNoWorkspaceProtocol(manifest, pkgName) {
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const deps = manifest[field];
    if (!deps) continue;
    for (const [dep, range] of Object.entries(deps)) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        errors.push(
          `${pkgName}: ${field}["${dep}"] uses "workspace:" protocol (${range}) in dist manifest`,
        );
      }
    }
  }
}

function checkRequiredFields(manifest, pkgName) {
  for (const field of ['name', 'version']) {
    if (!manifest[field]) {
      errors.push(`${pkgName}: missing required field "${field}"`);
    }
  }
  if (!manifest.module && !manifest.exports) {
    errors.push(
      `${pkgName}: missing both "module" and "exports" (ng-packagr output)`,
    );
  }
  if (!manifest.typings && !manifest.exports) {
    errors.push(
      `${pkgName}: missing both "typings" and "exports" (no type declarations referenced)`,
    );
  }
}

for (const pkg of packages) {
  const manifestPath = join(workspaceRoot, 'dist', 'libs', pkg, 'package.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    errors.push(
      `${pkg}: could not read/parse ${manifestPath} (${err.message})`,
    );
    continue;
  }
  checkNoWorkspaceProtocol(manifest, pkg);
  checkRequiredFields(manifest, pkg);
}

if (errors.length > 0) {
  console.error('Dist manifest verification failed:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`Dist manifest verification passed for: ${packages.join(', ')}`);
