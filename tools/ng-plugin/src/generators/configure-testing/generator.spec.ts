import * as devkit from '@nx/devkit';
import {
  addProjectConfiguration,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import configureTestingGenerator from './generator';
import { ConfigureTestingGeneratorSchema } from './schema';

vi.mock('@nx/devkit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nx/devkit')>()),
  installPackagesTask: vi.fn(),
}));

const LIB_SPEC = 'libs/my-lib/tsconfig.spec.json';
const APP_SPEC = 'apps/my-app/tsconfig.spec.json';

function createLib(tree: Tree, executor = '@nx/angular:unit-test'): void {
  addProjectConfiguration(tree, 'my-lib', {
    root: 'libs/my-lib',
    sourceRoot: 'libs/my-lib/src',
    projectType: 'library',
    targets: {
      build: { executor: '@nx/angular:package' },
      test: {
        executor,
        options: { watch: false, include: ['src/**/*.spec.ts'] },
      },
    },
  });
  tree.write(
    LIB_SPEC,
    JSON.stringify({
      extends: './tsconfig.json',
      include: ['src/**/*.spec.ts'],
    }),
  );
}

function createApp(tree: Tree): void {
  addProjectConfiguration(tree, 'my-app', {
    root: 'apps/my-app',
    sourceRoot: 'apps/my-app/src',
    projectType: 'application',
    targets: { build: { executor: '@angular/build:application' } },
  });
}

function testTarget(tree: Tree, project: string) {
  return readProjectConfiguration(tree, project).targets?.['test'];
}

function snapshot(tree: Tree): Record<string, string | null> {
  const files = [
    'package.json',
    LIB_SPEC,
    APP_SPEC,
    'libs/my-lib/project.json',
    'apps/my-app/project.json',
  ];
  return Object.fromEntries(
    files.map((f) => [f, tree.exists(f) ? tree.read(f, 'utf-8') : null]),
  );
}

const run = (tree: Tree, o: Partial<ConfigureTestingGeneratorSchema>) =>
  configureTestingGenerator(tree, {
    project: 'my-lib',
    skipInstall: true,
    ...o,
  });

describe('configureTestingGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    createLib(tree);
    createApp(tree);
    vi.mocked(devkit.installPackagesTask).mockClear();
  });

  it('sets the coverage threshold and keeps other options', async () => {
    await run(tree, { coverageThreshold: 80 });
    const options = testTarget(tree, 'my-lib')?.options;
    expect(options.coverage).toBe(true);
    expect(options.coverageReporters).toEqual(['text', 'html', 'json']);
    expect(options.coverageThresholds).toEqual({
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    });
    expect(options.watch).toBe(false);
    expect(options.include).toEqual(['src/**/*.spec.ts']);
  });

  it('defaults the threshold to 35 and splits reporters', async () => {
    await run(tree, {});
    expect(testTarget(tree, 'my-lib')?.options.coverageThresholds).toEqual({
      statements: 35,
      branches: 35,
      functions: 35,
      lines: 35,
    });
    await run(tree, { reporters: 'text-summary, lcov' });
    expect(testTarget(tree, 'my-lib')?.options.coverageReporters).toEqual([
      'text-summary',
      'lcov',
    ]);
  });

  it('adds a test target and tsconfig.spec.json when missing', async () => {
    await run(tree, { project: 'my-app' });
    const target = testTarget(tree, 'my-app');
    expect(target?.executor).toBe('@nx/angular:unit-test');
    expect(target?.options.tsConfig).toBe(APP_SPEC);
    expect(target?.options.watch).toBe(false);
    expect(target?.options.coverage).toBe(true);
    expect(target?.options.coverageReporters).toEqual(['text', 'html', 'json']);
    expect(target?.options.coverageThresholds.lines).toBe(35);
    expect(readJson(tree, APP_SPEC)).toEqual({
      extends: './tsconfig.json',
      compilerOptions: {
        outDir: '../../dist/out-tsc',
        types: ['vitest/globals'],
      },
      include: ['src/**/*.ts', 'src/**/*.d.ts'],
      exclude: ['**/*.stories.ts', '**/*.stories.js'],
    });
  });

  it('patches an existing tsconfig.spec.json', async () => {
    await run(tree, {});
    const json = readJson(tree, LIB_SPEC);
    expect(json.include).toEqual([
      'src/**/*.spec.ts',
      'src/**/*.ts',
      'src/**/*.d.ts',
    ]);
    expect(json.exclude).toEqual(['**/*.stories.ts', '**/*.stories.js']);
    expect(json.compilerOptions.types).toEqual(['vitest/globals']);
  });

  it('declares the Vitest dependencies and keeps existing versions', async () => {
    devkit.updateJson(tree, 'package.json', (j) => {
      j.devDependencies = { ...j.devDependencies, vitest: '^4.0.0' };
      return j;
    });
    await run(tree, {});
    const dev = readJson(tree, 'package.json').devDependencies;
    expect(dev['vitest']).toBe('^4.0.0');
    expect(dev['@vitest/coverage-v8']).toBe('^4.1.12');
    expect(dev['jsdom']).toBe('^27.4.0');
  });

  it('adds the dependencies when absent', async () => {
    await run(tree, {});
    expect(readJson(tree, 'package.json').devDependencies['vitest']).toBe(
      '^4.1.12',
    );
  });

  it('is idempotent', async () => {
    await run(tree, {});
    await run(tree, { project: 'my-app' });
    const first = snapshot(tree);
    await run(tree, {});
    await run(tree, { project: 'my-app' });
    expect(snapshot(tree)).toEqual(first);
  });

  it('refuses another executor and changes nothing', async () => {
    tree = createTreeWithEmptyWorkspace();
    createLib(tree, '@nx/vitest:test');
    const before = snapshot(tree);
    const error = await run(tree, {}).catch((e: Error) => e.message);
    expect(error).toContain('@nx/angular:unit-test');
    expect(error).toContain('@nx/vitest:test');
    expect(snapshot(tree)).toEqual(before);
  });

  it('refuses a non-Angular project', async () => {
    addProjectConfiguration(tree, 'plain', { root: 'libs/plain', targets: {} });
    await expect(run(tree, { project: 'plain' })).rejects.toThrow(
      'Project "plain" is not an Angular application or library.',
    );
  });

  it('returns undefined with skipInstall and an install callback without', async () => {
    expect(await run(tree, {})).toBeUndefined();
    const callback = await run(tree, { skipInstall: false });
    expect(callback).toBeInstanceOf(Function);
    expect(devkit.installPackagesTask).not.toHaveBeenCalled();
    await callback?.();
    expect(devkit.installPackagesTask).toHaveBeenCalled();
  });
});
