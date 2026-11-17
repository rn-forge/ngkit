import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as devkit from '@nx/devkit';
import {
  addProjectConfiguration,
  readJson,
  readProjectConfiguration,
  Tree,
  workspaceRoot,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PEER_DEPENDENCIES } from '../../utils/versions';
import setupGenerator from './generator';
import { SetupGeneratorSchema } from './schema';

vi.mock('@nx/devkit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nx/devkit')>()),
  installPackagesTask: vi.fn(),
}));

const pluginVersion: string = JSON.parse(
  readFileSync(join(__dirname, '../../../package.json'), 'utf-8'),
).version;
const STYLES = 'apps/my-app/src/styles.scss';
const APP_CONFIG = 'apps/my-app/src/app/app.config.ts';
const TABLE = ['bootstrap-table', 'jquery', 'jquery-treegrid'];
const COMMONJS = [
  'bootstrap/dist/js/bootstrap.bundle.js',
  'build-url-ts',
  'jquery',
  'jquery-treegrid',
  'quill-delta',
];

function buildOptions(tree: Tree): Record<string, unknown> {
  return readProjectConfiguration(tree, 'my-app').targets?.['build']?.options;
}

function createApp(tree: Tree, options: Record<string, unknown> = {}): void {
  addProjectConfiguration(tree, 'my-app', {
    root: 'apps/my-app',
    sourceRoot: 'apps/my-app/src',
    projectType: 'application',
    targets: {
      build: {
        executor: '@angular/build:application',
        options: {
          styles: [STYLES],
          scripts: [],
          assets: ['apps/my-app/public'],
          ...options,
        },
      },
    },
  });
  tree.write(STYLES, 'body {\n  margin: 0;\n}\n');
  tree.write(
    APP_CONFIG,
    [
      "import { ApplicationConfig } from '@angular/core';",
      "import { provideRouter } from '@angular/router';",
      '',
      'export const appConfig: ApplicationConfig = {',
      '  providers: [provideRouter(routes)],',
      '};',
      '',
    ].join('\n'),
  );
}

function snapshot(tree: Tree): Record<string, string | null> {
  const files = [
    'package.json',
    'apps/my-app/project.json',
    STYLES,
    APP_CONFIG,
  ];
  return Object.fromEntries(
    files.map((file) => [file, tree.read(file, 'utf-8')]),
  );
}

const run = (tree: Tree, options: Partial<SetupGeneratorSchema> = {}) =>
  setupGenerator(tree, { project: 'my-app', skipInstall: true, ...options });

describe('setup generator', () => {
  let tree: Tree;

  beforeEach(() => {
    vi.clearAllMocks();
    tree = createTreeWithEmptyWorkspace();
    createApp(tree);
  });

  it('configures the application', async () => {
    await run(tree);

    const { dependencies } = readJson(tree, 'package.json');
    expect(dependencies['@rn-forge/ng']).toBe(`^${pluginVersion}`);
    expect(dependencies['@rn-forge/ng-bootstrap']).toBe(`^${pluginVersion}`);
    for (const [name, range] of Object.entries(PEER_DEPENDENCIES)) {
      expect(dependencies[name]).toBe(range);
    }
    for (const name of TABLE) {
      expect(dependencies).toHaveProperty(name);
    }
    expect(tree.read(STYLES, 'utf-8')).toContain(
      "// rn-forge:start\n@use '@rn-forge/ng-bootstrap/assets/theme';\n// rn-forge:end\n",
    );
    const options = buildOptions(tree);
    expect(options['allowedCommonJsDependencies']).toEqual(COMMONJS);
    expect(options['polyfills']).toEqual(['@angular/localize/init']);
    expect(options['scripts']).toEqual([]);
    expect(options['assets']).toEqual(['apps/my-app/public']);
    const appConfig = tree.read(APP_CONFIG, 'utf-8');
    expect(appConfig).toContain(
      "import { provideRnForgeBootstrapConfig } from '@rn-forge/ng-bootstrap';",
    );
    expect(appConfig).toContain(
      'provideRouter(routes), provideRnForgeBootstrapConfig({})',
    );
  });

  it('is idempotent', async () => {
    await run(tree);
    const first = snapshot(tree);
    await run(tree);
    expect(snapshot(tree)).toEqual(first);
  });

  it('rejects a project that is not an Angular application', async () => {
    addProjectConfiguration(tree, 'my-lib', {
      root: 'libs/my-lib',
      projectType: 'library',
      targets: {},
    });
    const before = snapshot(tree);
    await expect(run(tree, { project: 'my-lib' })).rejects.toThrow(
      /Angular application/,
    );
    await expect(run(tree, { project: 'my-lib' })).rejects.toThrow(/my-lib/);
    expect(snapshot(tree)).toEqual(before);
  });

  it('returns an install callback unless skipInstall', async () => {
    expect(await run(tree)).toBeUndefined();

    const callback = await run(tree, {
      skipInstall: false,
      packageManager: 'npm',
    });
    expect(callback).toBeTypeOf('function');
    callback?.();
    expect(devkit.installPackagesTask).toHaveBeenCalledWith(
      tree,
      false,
      tree.root,
      'npm',
    );
  });

  it.each([{ skipStyles: true }, { includeTheme: false }])(
    'leaves the stylesheet alone with %o',
    async (options) => {
      await run(tree, options);
      expect(tree.read(STYLES, 'utf-8')).toBe('body {\n  margin: 0;\n}\n');
    },
  );

  it('keeps an existing unmarked theme import', async () => {
    const content = "@use '@rn-forge/ng-bootstrap/assets/theme';\nbody {}\n";
    tree.write(STYLES, content);
    await run(tree);
    expect(tree.read(STYLES, 'utf-8')).toBe(content);
  });

  it('puts the import between existing markers', async () => {
    tree.write(STYLES, '// rn-forge:start\n// rn-forge:end\nbody {}\n');
    await run(tree);
    expect(tree.read(STYLES, 'utf-8')).toBe(
      "// rn-forge:start\n@use '@rn-forge/ng-bootstrap/assets/theme';\n// rn-forge:end\nbody {}\n",
    );
  });

  it('preserves existing build options', async () => {
    const other = createTreeWithEmptyWorkspace();
    createApp(other, {
      allowedCommonJsDependencies: ['lodash'],
      polyfills: ['zone.js'],
    });
    await run(other);
    const options = buildOptions(other);
    expect(options['allowedCommonJsDependencies']).toEqual(
      [...COMMONJS, 'lodash'].sort(),
    );
    expect(options['polyfills']).toEqual(['zone.js', '@angular/localize/init']);
  });

  it('turns a string polyfill into an array', async () => {
    const other = createTreeWithEmptyWorkspace();
    createApp(other, { polyfills: 'zone.js' });
    await run(other);
    expect(buildOptions(other)['polyfills']).toEqual([
      'zone.js',
      '@angular/localize/init',
    ]);
  });

  it('omits the Bootstrap Table packages when includeBootstrapTable is false', async () => {
    await run(tree, { includeBootstrapTable: false });
    const { dependencies } = readJson(tree, 'package.json');
    for (const name of TABLE) {
      expect(dependencies).not.toHaveProperty(name);
    }
    expect(dependencies).toHaveProperty('bootstrap');
  });

  it('skips build options and app.config.ts with skipConfig', async () => {
    const before = snapshot(tree);
    await run(tree, { skipConfig: true });
    const after = snapshot(tree);
    expect(after['apps/my-app/project.json']).toBe(
      before['apps/my-app/project.json'],
    );
    expect(after[APP_CONFIG]).toBe(before[APP_CONFIG]);
  });

  it('warns and skips a missing app.config.ts', async () => {
    tree.delete(APP_CONFIG);
    await run(tree);
    expect(tree.exists(APP_CONFIG)).toBe(false);
  });

  it('keeps the peer constant in sync with ng-bootstrap', () => {
    const { peerDependencies } = JSON.parse(
      readFileSync(
        join(workspaceRoot, 'libs/ng-bootstrap/package.json'),
        'utf-8',
      ),
    );
    delete peerDependencies['@rn-forge/ng'];
    expect(PEER_DEPENDENCIES).toEqual(peerDependencies);
  });

  it('leaves the demo app configuration as it is', async () => {
    const demo = createTreeWithEmptyWorkspace();
    const demoFiles = [
      'apps/ng-demo/src/styles.scss',
      'apps/ng-demo/src/app/app.config.ts',
    ];
    const project = JSON.parse(
      readFileSync(join(workspaceRoot, 'apps/ng-demo/project.json'), 'utf-8'),
    );
    delete project.$schema;
    addProjectConfiguration(demo, 'ng-demo', {
      root: 'apps/ng-demo',
      ...project,
    });
    const originals = demoFiles.map((file) =>
      readFileSync(join(workspaceRoot, file), 'utf-8'),
    );
    demoFiles.forEach((file, index) => demo.write(file, originals[index]));
    const options = structuredClone(
      readProjectConfiguration(demo, 'ng-demo').targets?.['build']?.options,
    );

    await setupGenerator(demo, { project: 'ng-demo', skipInstall: true });

    expect(
      readProjectConfiguration(demo, 'ng-demo').targets?.['build']?.options,
    ).toEqual(options);
    demoFiles.forEach((file, index) =>
      expect(demo.read(file, 'utf-8')).toBe(originals[index]),
    );
  });
});
