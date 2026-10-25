#!/usr/bin/env node
/**
 * Installs the packed @rn-forge/ng tarball into throwaway consumer projects and
 * smoke-tests every secondary entry point, across the Angular peer matrix this
 * release supports. Exercises real `file:` tarball installation (no verdaccio,
 * no pnpm workspace membership) so a broken peer range, a leaked `workspace:*`
 * reference, or an undeclared runtime import surfaces before it reaches a
 * consumer. See docs/architecture/release-pipeline.md.
 *
 * Usage: node tools/scripts/verify-consumer.mjs [ng|ng-tailwind]   (default: ng)
 * `ng-tailwind` builds real Angular applications from the packed tarball, one
 * plain and one with Tailwind v4, and asserts on the built CSS and JS.
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

const target = process.argv[2] ?? 'ng';
if (!['ng', 'ng-tailwind'].includes(target)) {
  console.error(`Unknown target "${target}"; expected ng or ng-tailwind.`);
  process.exit(2);
}

// Pinned to the Tailwind version in the root lockfile.
const TAILWIND_VERSION = '4.3.3';

function resolveTarball(packageName = 'ng') {
  const version =
    packageName === 'ng'
      ? ngPackageJson.version
      : JSON.parse(
          readFileSync(
            join(workspaceRoot, 'libs', packageName, 'package.json'),
            'utf-8',
          ),
        ).version;
  const expectedName = `rn-forge-${packageName}-${version}.tgz`;
  const tarballPath = join(tarballsDir, expectedName);
  if (!existsSync(tarballPath)) {
    const found = existsSync(tarballsDir)
      ? readdirSync(tarballsDir).join(', ')
      : '(missing dir)';
    throw new Error(
      `Expected packed tarball at ${tarballPath} (found: ${found}). Run "nx run ${packageName}:pack" ` +
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

// ---------------------------------------------------------------------------
// ng-tailwind: real Angular application builds from the packed tarball.
// ---------------------------------------------------------------------------

const APP_TS = (
  changeDetectionMode,
) => `import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideZoneChangeDetection,
  provideZonelessChangeDetection,
} from '@angular/core';
import { RnfButton } from '@rn-forge/ng-tailwind';

@Component({
  selector: 'app-root',
  imports: [RnfButton],
  templateUrl: './app.html',
})
class App {}

bootstrapApplication(App, {
  providers: [${
    changeDetectionMode === 'zone'
      ? 'provideZoneChangeDetection()'
      : 'provideZonelessChangeDetection()'
  }],
});
`;

const PLAIN_HTML = `<button rnfButton>Save</button>
<a rnfButton href="#">Link</a>
`;

const TAILWIND_HTML = `<button rnfButton class="w-full">Save</button>
<a rnfButton href="#">Link</a>
<div class="bg-surface-1 text-muted rounded-control">Panel</div>
<div class="bg-slate-500">Default palette</div>
`;

const PLAIN_CSS = `@import '@rn-forge/ng-tailwind/tokens.css';
`;

// README order: tokens, the app's own theme file, tailwindcss, then the bridge.
const TAILWIND_CSS = `@import '@rn-forge/ng-tailwind/tokens.css';
@import '@rn-forge/ng-tailwind/base.css';
@import './theme.css';
@import 'tailwindcss';
@source './';
@import '@rn-forge/ng-tailwind/tailwind.css';
`;

const THEME_CSS = `:root {
  color-scheme: light dark;
}
`;

function writeAngularApp(
  dir,
  withTailwind,
  angularVersion,
  changeDetectionMode,
) {
  const dependencies = {
    '@angular/common': angularVersion,
    '@angular/compiler': angularVersion,
    '@angular/core': angularVersion,
    '@angular/platform-browser': angularVersion,
    '@rn-forge/ng-tailwind': `file:${resolveTarball('ng-tailwind')}`,
    rxjs: rxjsRange,
    'zone.js': '~0.16.0',
  };
  const devDependencies = {
    '@angular/build': angularVersion,
    '@angular/cli': angularVersion,
    '@angular/compiler-cli': angularVersion,
    typescript: '~6.0.3',
  };
  if (withTailwind) {
    devDependencies.tailwindcss = TAILWIND_VERSION;
    devDependencies['@tailwindcss/postcss'] = TAILWIND_VERSION;
  }
  const write = (file, content) => {
    mkdirSync(join(dir, file, '..'), { recursive: true });
    writeFileSync(
      join(dir, file),
      typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    );
  };
  write('package.json', {
    name: `rnf-consumer-fixture-${dir.split('/').pop()}`,
    private: true,
    type: 'module',
    dependencies,
    devDependencies,
  });
  write('angular.json', {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    projects: {
      app: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: {
              browser: 'src/main.ts',
              tsConfig: 'tsconfig.app.json',
              styles: ['src/styles.css'],
              polyfills: changeDetectionMode === 'zone' ? ['zone.js'] : [],
              outputPath: 'out',
              index: 'src/index.html',
            },
            configurations: {
              production: { outputHashing: 'none' },
            },
            defaultConfiguration: 'production',
          },
        },
      },
    },
  });
  write('tsconfig.json', {
    compileOnSave: false,
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'preserve',
      moduleResolution: 'bundler',
      skipLibCheck: true,
      isolatedModules: true,
    },
    angularCompilerOptions: { strictTemplates: true },
  });
  write('tsconfig.app.json', {
    extends: './tsconfig.json',
    compilerOptions: { types: [] },
    files: ['src/main.ts'],
  });
  write(
    'src/index.html',
    '<!doctype html><html><head><meta charset="utf-8"><title>fixture</title><base href="/"></head><body><app-root></app-root></body></html>',
  );
  write('src/main.ts', APP_TS(changeDetectionMode));
  write('src/app.html', withTailwind ? TAILWIND_HTML : PLAIN_HTML);
  write('src/styles.css', withTailwind ? TAILWIND_CSS : PLAIN_CSS);
  if (withTailwind) {
    write('src/theme.css', THEME_CSS);
    // Angular's esbuild builder reads this file to run PostCSS plugins.
    write('.postcssrc.json', { plugins: { '@tailwindcss/postcss': {} } });
  }
}

function readBuilt(dir, extension) {
  const outDir = join(dir, 'out', 'browser');
  return readdirSync(outDir)
    .filter((file) => file.endsWith(extension))
    .map((file) => readFileSync(join(outDir, file), 'utf-8'))
    .join('\n');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ok: ${message}`);
}

/** Text of every CSS rule whose selector list contains `selector` (escaped class). */
function rulesFor(css, selector) {
  const re = new RegExp(
    `(^|[}\\s,])${selector.replace(/[.\\[\\]()]/g, '\\$&')}\\s*[,{][^}]*}`,
    'g',
  );
  return css.match(re) ?? [];
}

function assertPlainBuild(dir) {
  const css = readBuilt(dir, '.css');
  const js = readBuilt(dir, '.js');
  assert(css.includes('--rnf-surface-0'), 'plain CSS contains --rnf-surface-0');
  // Angular 22.1 prefixes component custom properties with a %NS% placeholder.
  assert(
    /@layer\s+rnf\s*\{/.test(js) && /--(?:%NS%)?rnf-button-bg/.test(js),
    'plain build ships the button @layer rnf rules (--rnf-button-bg)',
  );
  assert(
    !existsSync(join(dir, 'node_modules', 'tailwindcss')),
    'plain fixture has no node_modules/tailwindcss',
  );
}

function assertTailwindBuild(dir) {
  const css = readBuilt(dir, '.css');
  for (const [utility, token] of [
    ['.bg-surface-1', '--rnf-surface-1'],
    ['.text-muted', '--rnf-text-muted'],
    ['.rounded-control', '--rnf-radius-control'],
  ]) {
    const rules = rulesFor(css, utility).join('\n');
    assert(
      rules.includes(`var(${token})`),
      `Tailwind CSS has ${utility} resolving to var(--rnf-*): ${rules.trim().slice(0, 120)}`,
    );
  }
  assert(
    rulesFor(css, '.w-full').length > 0,
    'Tailwind CSS has a .w-full rule',
  );
  assert(
    rulesFor(css, '.bg-slate-500').length === 0,
    'Tailwind CSS has no .bg-slate-500 rule',
  );
}

function runTailwindFixture(angularKey, angularVersion, changeDetectionMode) {
  for (const flavour of ['plain', 'tailwind']) {
    const name = `ng-tailwind-${flavour}-angular-${angularKey}-${changeDetectionMode}`;
    const dir = join(fixturesRoot, name);
    console.log(`\n=== ${name} (Angular ${angularVersion}) ===`);
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 200,
    });
    mkdirSync(dir, { recursive: true });
    try {
      writeAngularApp(
        dir,
        flavour === 'tailwind',
        angularVersion,
        changeDetectionMode,
      );
      execFileSync(
        'npm',
        ['install', '--no-audit', '--no-fund', '--loglevel=error'],
        { cwd: dir, stdio: 'inherit' },
      );
      execFileSync('npx', ['ng', 'build'], { cwd: dir, stdio: 'inherit' });
      if (flavour === 'plain') assertPlainBuild(dir);
      else assertTailwindBuild(dir);
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
    }
  }
}

for (const [angularKey, angularVersion] of Object.entries(ANGULAR_VERSIONS)) {
  for (const changeDetectionMode of CHANGE_DETECTION_MODES) {
    if (target === 'ng')
      runFixture(angularKey, angularVersion, changeDetectionMode);
    else runTailwindFixture(angularKey, angularVersion, changeDetectionMode);
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
