#!/usr/bin/env node
/**
 * `kiln-devops consumer` hook for @rn-forge/ng. Run as
 * `node tools/consumer/ng-smoke.mjs <fixture-dir> <cell>` after kiln has installed
 * the packed tarball into the cell's fixture and imported every entry point.
 * Adds the LocalStorageService round trip through DI. The cell name is
 * `<angular>-<zone|zoneless>`.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [fixture, cell] = process.argv.slice(2);
const cellMatch = /^\d+\.\d+-(zone|zoneless)$/.exec(cell ?? '');
if (!fixture || !cellMatch) {
  console.error('Usage: ng-smoke.mjs <fixture-dir> <angular>-<zone|zoneless>');
  process.exit(2);
}
const changeDetectionMode = cellMatch[1];

// The script runs from the fixture directory, so `@angular/core` and
// `@rn-forge/ng` resolve from the fixture's node_modules, not this workspace's.
const script = `
// A real consumer app builds through the Angular CLI, which runs the linker
// so libraries ship fully AOT-compiled. This bare Node smoke test has no
// bundler in front of it, so classes with partial compilation (e.g.
// @angular/common's PlatformLocation, referenced transitively by
// RouteService) need the JIT compiler as a fallback.
import '@angular/compiler';
import { Injector } from '@angular/core';
import { provideRnForgeCoreConfig, LocalStorageService, RNF_BROWSER_STORAGE } from '@rn-forge/ng/core';

// "zone" mode loads zone.js like a classic Angular app would; "zoneless" mode
// deliberately omits it, matching provideZonelessChangeDetection() consumers.
if ('${changeDetectionMode}' === 'zone') {
  await import('zone.js');
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

console.log('OK (round trip, ${changeDetectionMode})');
`;

writeFileSync(join(fixture, 'roundtrip.mjs'), script);
execFileSync('node', ['roundtrip.mjs'], { cwd: fixture, stdio: 'inherit' });
