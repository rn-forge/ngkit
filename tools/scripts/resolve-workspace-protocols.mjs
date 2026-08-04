#!/usr/bin/env node
/**
 * Resolves workspace:* protocol references in dist package.json manifests,
 * replacing them with the actual version from the corresponding source package.json.
 *
 * Used before a dry-run publish to prevent pnpm from failing on unresolved
 * workspace protocols (the version step doesn't write files in dry-run mode).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = process.cwd();
const packages = ['ng', 'ng-bootstrap'];

/** @type {Map<string, string>} packageName -> version */
const workspaceVersions = new Map();

// Collect the current version for each workspace package from its source manifest.
for (const pkg of packages) {
  const srcManifest = JSON.parse(
    readFileSync(join(workspaceRoot, 'libs', pkg, 'package.json'), 'utf-8'),
  );
  workspaceVersions.set(srcManifest.name, srcManifest.version);
}

let changed = 0;

for (const pkg of packages) {
  const distManifestPath = join(
    workspaceRoot,
    'dist',
    'libs',
    pkg,
    'package.json',
  );
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(distManifestPath, 'utf-8'));
  } catch {
    // dist not built yet – nothing to patch
    continue;
  }

  let patched = false;
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const deps = manifest[field];
    if (!deps) continue;
    for (const [dep, range] of Object.entries(deps)) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        const resolved = workspaceVersions.get(dep);
        if (resolved) {
          deps[dep] = resolved;
          patched = true;
          console.log(
            `  ${pkg}: ${field}["${dep}"] workspace:* -> ${resolved}`,
          );
        } else {
          console.warn(
            `  ${pkg}: ${field}["${dep}"] uses workspace: but no local version found`,
          );
        }
      }
    }
  }

  if (patched) {
    writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2) + '\n');
    changed++;
  }
}

console.log(
  `resolve-workspace-protocols: patched ${changed} dist manifest(s).`,
);
