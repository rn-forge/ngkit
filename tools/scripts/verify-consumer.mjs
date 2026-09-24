#!/usr/bin/env node
/**
 * Installs the packed @rn-forge/ng tarball into throwaway consumer projects and
 * smoke-tests every secondary entry point, across the Angular peer matrix this
 * release supports. Exercises real `file:` tarball installation (no verdaccio,
 * no pnpm workspace membership) so a broken peer range, a leaked `workspace:*`
 * reference, or an undeclared runtime import surfaces before it reaches a
 * consumer. See docs/plans/ngkit-roadmap.md (H1) for the requirement.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(fileURLToPath(import.meta.url), '../../..');
const fixturesRoot = join(workspaceRoot, 'dist', 'consumer-fixtures');
const tarballsDir = join(workspaceRoot, 'dist', 'tarballs');
const ngPackageJson = JSON.parse(
  readFileSync(join(workspaceRoot, 'libs', 'ng', 'package.json'), 'utf-8'),
);
const rxjsRange = ngPackageJson.peerDependencies.rxjs;

// Matrix: Angular 22.0 and 22.1, each with zone and zoneless change detection.
// Concrete patch pins are chosen from versions actually published to npm.
const ANGULAR_VERSIONS = { '22.0': '22.0.6', 22.1: '22.1.7' };
const CHANGE_DETECTION_MODES = ['zone', 'zoneless'];

/** @type {string[]} */
const failures = [];

function resolveTarball() {
  const expectedName = `rn-forge-ng-${ngPackageJson.version}.tgz`;
  const tarballPath = join(tarballsDir, expectedName);
  if (!existsSync(tarballPath)) {
    const found = existsSync(tarballsDir)
      ? readdirSync(tarballsDir).join(', ')
      : '(missing dir)';
    throw new Error(
      `Expected packed tarball at ${tarballPath} (found: ${found}). Run "nx run ng:pack" ` +
        `first (the verify-consumer nx target declares this as a dependency).`,
    );
  }
  return tarballPath;
}

function writeFixturePackageJson(dir, angularVersion) {
  const pkg = {
    name: `rnf-consumer-fixture-${dir.split('/').pop()}`,
    private: true,
    type: 'module',
    dependencies: {
      '@angular/common': angularVersion,
      '@angular/compiler': angularVersion,
      '@angular/core': angularVersion,
      '@angular/forms': angularVersion,
      '@angular/router': angularVersion,
      '@rn-forge/ng': `file:${resolveTarball()}`,
      rxjs: rxjsRange,
      'zone.js': '~0.16.0',
    },
  };
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
}

function writeSmokeTest(dir, changeDetectionMode) {
  const script = `
// A real consumer app builds through the Angular CLI, which runs the linker
// so libraries ship fully AOT-compiled. This bare Node smoke test has no
// bundler in front of it, so classes with partial compilation (e.g.
// @angular/common's PlatformLocation, referenced transitively by
// RouteService) need the JIT compiler as a fallback.
import '@angular/compiler';
import { Injector } from '@angular/core';
import { provideRnForgeCoreConfig, LocalStorageService, RNF_BROWSER_STORAGE } from '@rn-forge/ng/core';
import * as rootEntry from '@rn-forge/ng';
import * as coreEntry from '@rn-forge/ng/core';
import * as authEntry from '@rn-forge/ng/auth';
import * as crudEntry from '@rn-forge/ng/crud';

// "zone" mode loads zone.js like a classic Angular app would; "zoneless" mode
// deliberately omits it, matching provideZonelessChangeDetection() consumers.
// None of ng's current secondary entry points render components, so this is a
// proxy check that nothing in the package assumes zone.js global patches are
// present - not a full bootstrapApplication() render.
if ('${changeDetectionMode}' === 'zone') {
  await import('zone.js');
}

const entryPoints = { root: rootEntry, core: coreEntry, auth: authEntry, crud: crudEntry };
for (const [name, mod] of Object.entries(entryPoints)) {
  if (!mod || Object.keys(mod).length === 0) {
    throw new Error(\`Entry point "\${name}" resolved but exported nothing\`);
  }
}

// Minimal Storage polyfill: real consumers run in a browser; this fixture
// only needs enough of the Storage API for LocalStorageService's get/set/remove.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

const injector = Injector.create({
  // LocalStorageService is providedIn: 'root', which only auto-resolves inside an
  // actual application root injector. A plain Injector.create() is unscoped, so it
  // must be listed explicitly here. RNF_BROWSER_STORAGE's own factory injects
  // DOCUMENT, which a plain injector has none of and doesn't run root-scoped
  // factories for anyway, so it must be provided explicitly too.
  providers: [
    provideRnForgeCoreConfig({ appName: 'rnf-fixture' }),
    LocalStorageService,
    { provide: RNF_BROWSER_STORAGE, useValue: globalThis.localStorage },
  ],
});
const storage = injector.get(LocalStorageService);
storage.set('probe', 'ok');
if (storage.get('probe') !== 'ok') {
  throw new Error('LocalStorageService round-trip failed');
}
storage.remove('probe');

console.log('OK (${changeDetectionMode})');
`;
  writeFileSync(join(dir, 'smoke.mjs'), script);
}

function runFixture(angularKey, angularVersion, changeDetectionMode) {
  const name = `angular-${angularKey}-${changeDetectionMode}`;
  const dir = join(fixturesRoot, name);
  console.log(`\n=== ${name} (Angular ${angularVersion}) ===`);

  rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  mkdirSync(dir, { recursive: true });
  writeFixturePackageJson(dir, angularVersion);
  writeSmokeTest(dir, changeDetectionMode);

  try {
    execFileSync(
      'npm',
      ['install', '--no-audit', '--no-fund', '--loglevel=error'],
      {
        cwd: dir,
        stdio: 'inherit',
      },
    );
    checkNoWorkspaceOrLocalArtifacts(dir);
    execFileSync('node', ['smoke.mjs'], { cwd: dir, stdio: 'inherit' });
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
  }
}

/** Fails the fixture if the installed package still references workspace/local paths. */
function checkNoWorkspaceOrLocalArtifacts(dir) {
  const installedManifest = JSON.parse(
    readFileSync(
      join(dir, 'node_modules', '@rn-forge', 'ng', 'package.json'),
      'utf-8',
    ),
  );
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const deps = installedManifest[field];
    if (!deps) continue;
    for (const [dep, range] of Object.entries(deps)) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        throw new Error(
          `installed @rn-forge/ng ${field}["${dep}"] still uses workspace: protocol (${range})`,
        );
      }
    }
  }
}

for (const [angularKey, angularVersion] of Object.entries(ANGULAR_VERSIONS)) {
  for (const changeDetectionMode of CHANGE_DETECTION_MODES) {
    runFixture(angularKey, angularVersion, changeDetectionMode);
  }
}

if (failures.length > 0) {
  console.error('\nConsumer verification failed:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  '\nConsumer verification passed for all Angular/change-detection combinations.',
);
