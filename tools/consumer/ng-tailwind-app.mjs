#!/usr/bin/env node
/**
 * `kiln-devops consumer` hook for @rn-forge/ng-tailwind. Run as
 * `node tools/consumer/ng-tailwind-app.mjs <fixture-dir> <cell>` after kiln has
 * installed the packed tarball into the cell's fixture and smoke-tested the entry
 * points. Builds a real Angular application from the tarball with `ng build`,
 * plain (tokens.css only) or with Tailwind v4 (the sheets in the README order),
 * and asserts on the built CSS and JS. The flavour and the change-detection mode
 * come from the cell name, `<plain|tailwind>-<angular>-<zone|zoneless>`; the
 * Angular, rxjs, zone.js and tailwindcss versions and the `file:` tarball come
 * from the `package.json` kiln wrote into the fixture.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';

const [fixture, cell] = process.argv.slice(2);
const cellMatch = /^(plain|tailwind)-\d+\.\d+-(zone|zoneless)$/.exec(
  cell ?? '',
);
if (!fixture || !cellMatch) {
  console.error(
    'Usage: ng-tailwind-app.mjs <fixture-dir> <plain|tailwind>-<angular>-<zone|zoneless>',
  );
  process.exit(2);
}
const flavour = cellMatch[1];
const changeDetectionMode = cellMatch[2];

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
<div style="width:400px" data-test="w400"><button rnfButton class="w-full" data-test="wfull">Full</button></div>
<button rnfButton variant="primary" data-test="primary">Primary</button>
<a rnfButton href="#">Link</a>
<div class="bg-surface-1 text-muted rounded-control">Panel</div>
<div class="bg-slate-500">Default palette</div>
`;

const PLAIN_CSS = `@import '@rn-forge/ng-tailwind/tokens.css';
`;

// README order: the layer statement, tokens, the app's own theme file, tailwindcss, then the
// bridge. The statement puts `rnf` after Tailwind's preflight (`base`), which would otherwise
// reset the button's background, and before `utilities`.
// './override.css' comes next: an unlayered app rule that precedes the package's tokens in
// source order. The package's rules sit in @layer rnf, so the app rule wins whatever the
// order; this fixture proves it with the earliest placement.
const TAILWIND_CSS = `@layer theme, base, rnf, components, utilities;
@import './override.css';
@import '@rn-forge/ng-tailwind/tokens.css';
@import '@rn-forge/ng-tailwind/base.css';
@import './theme.css';
@import 'tailwindcss';
@source './';
@import '@rn-forge/ng-tailwind/tailwind.css';
`;

const OVERRIDE_ACCENT = '#ff00ff';
const OVERRIDE_CSS = `:root {
  --rnf-accent: ${OVERRIDE_ACCENT};
}
`;

const THEME_CSS = `:root {
  color-scheme: light dark;
}
`;

function writeAngularApp(dir, withTailwind, changeDetectionMode) {
  const installed = JSON.parse(
    readFileSync(join(dir, 'package.json'), 'utf-8'),
  );
  // kiln's cell lists tailwindcss with the runtime dependencies; an app needs it
  // (and its PostCSS plugin) as a build tool.
  const { tailwindcss, ...dependencies } = installed.dependencies;
  const angularVersion = dependencies['@angular/core'];
  const devDependencies = {
    '@angular/build': angularVersion,
    '@angular/cli': angularVersion,
    '@angular/compiler-cli': angularVersion,
    typescript: '~6.0.3',
  };
  if (withTailwind) {
    devDependencies.tailwindcss = tailwindcss;
    devDependencies['@tailwindcss/postcss'] = tailwindcss;
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
    write('src/override.css', OVERRIDE_CSS);
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

writeAngularApp(fixture, flavour === 'tailwind', changeDetectionMode);
execFileSync(
  'npm',
  ['install', '--no-audit', '--no-fund', '--loglevel=error'],
  {
    cwd: fixture,
    stdio: 'inherit',
  },
);
execFileSync('npx', ['ng', 'build'], { cwd: fixture, stdio: 'inherit' });
if (flavour === 'plain') assertPlainBuild(fixture);
else assertTailwindBuild(fixture);
