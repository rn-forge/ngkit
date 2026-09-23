#!/usr/bin/env node
/**
 * Rewrites `workspace:*` (and `workspace:^` / `workspace:~`) dependency ranges
 * in a built dist package.json to a real semver range, using the current
 * version of the referenced local package.
 *
 * `nx release version`'s `manifestRootsToUpdate` + `preserveLocalDependencyProtocols:
 * false` already does this during an actual release. Plain `nx pack` (used by
 * ci.yml's `package` job to produce CI-only tarballs) never runs that release
 * step, so without this, a dependency like ng-bootstrap's peer on `@rn-forge/ng`
 * ships the literal `workspace:*` string, which `npm install`/`pnpm install`
 * cannot resolve for an external consumer.
 *
 * Usage: node resolve-dist-workspace-deps.mjs <dist-package-json-path>
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , distManifestArg] = process.argv;
if (!distManifestArg) {
  console.error(
    'Usage: node resolve-dist-workspace-deps.mjs <dist-package-json-path>',
  );
  process.exit(1);
}

const workspaceRoot = process.cwd();
const distManifestPath = join(workspaceRoot, distManifestArg);

function findLocalPackageVersions() {
  /** @type {Map<string, string>} */
  const versions = new Map();
  const libsDir = join(workspaceRoot, 'libs');
  for (const entry of readdirSync(libsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(libsDir, entry.name, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name && pkg.version) {
        versions.set(pkg.name, pkg.version);
      }
    } catch {
      // no package.json at libs/<entry>/package.json - not a publishable root, skip
    }
  }
  return versions;
}

function resolveWorkspaceRange(range, dep, localVersions) {
  const version = localVersions.get(dep);
  if (!version) {
    throw new Error(
      `Cannot resolve "${range}" for "${dep}": no local package version found`,
    );
  }
  const protocolValue = range.slice('workspace:'.length);
  if (protocolValue === '*' || protocolValue === '') return version;
  if (protocolValue === '^') return `^${version}`;
  if (protocolValue === '~') return `~${version}`;
  // An explicit version/range after "workspace:" (e.g. "workspace:1.2.3") is used as-is.
  return protocolValue;
}

const localVersions = findLocalPackageVersions();
const manifest = JSON.parse(readFileSync(distManifestPath, 'utf-8'));
let changed = false;

for (const field of [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  const deps = manifest[field];
  if (!deps) continue;
  for (const [dep, range] of Object.entries(deps)) {
    if (typeof range === 'string' && range.startsWith('workspace:')) {
      deps[dep] = resolveWorkspaceRange(range, dep, localVersions);
      changed = true;
    }
  }
}

if (changed) {
  writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `Resolved workspace: protocol dependencies in ${distManifestArg}`,
  );
} else {
  console.log(
    `No workspace: protocol dependencies found in ${distManifestArg}`,
  );
}
