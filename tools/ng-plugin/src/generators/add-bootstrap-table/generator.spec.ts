import * as devkit from '@nx/devkit';
import {
  addProjectConfiguration,
  readJson,
  Tree,
  updateJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PEER_DEPENDENCIES } from '../../utils/versions';
import addBootstrapTableGenerator from './generator';
import { AddBootstrapTableGeneratorSchema } from './schema';

vi.mock('@nx/devkit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nx/devkit')>()),
  installPackagesTask: vi.fn(),
}));

const PROJECT = 'apps/my-app/project.json';
const EXAMPLE_DIR = 'apps/my-app/src/app/bootstrap-table-example';
const EXAMPLE = `${EXAMPLE_DIR}/bootstrap-table-example.component.ts`;
const TABLE = ['bootstrap-table', 'jquery', 'jquery-treegrid'] as const;

function createApp(tree: Tree, prefix?: string): void {
  addProjectConfiguration(tree, 'my-app', {
    root: 'apps/my-app',
    sourceRoot: 'apps/my-app/src',
    projectType: 'application',
    ...(prefix ? { prefix } : {}),
    targets: {
      build: {
        executor: '@angular/build:application',
        options: { styles: [], scripts: [], assets: [] },
      },
    },
  });
}

function snapshot(tree: Tree): Record<string, string | null> {
  return Object.fromEntries(
    ['package.json', PROJECT, EXAMPLE].map((file) => [
      file,
      tree.read(file, 'utf-8'),
    ]),
  );
}

const run = (
  tree: Tree,
  options: Partial<AddBootstrapTableGeneratorSchema> = {},
) =>
  addBootstrapTableGenerator(tree, {
    project: 'my-app',
    skipInstall: true,
    ...options,
  });

describe('add-bootstrap-table generator', () => {
  let tree: Tree;

  beforeEach(() => {
    vi.clearAllMocks();
    tree = createTreeWithEmptyWorkspace();
    createApp(tree, 'acme');
  });

  it('adds the Bootstrap Table dependencies', async () => {
    updateJson(tree, 'package.json', (json) => {
      json.dependencies = { ...json.dependencies, jquery: '^3.7.1' };
      return json;
    });
    await run(tree);
    const { dependencies } = readJson(tree, 'package.json');
    for (const name of TABLE) {
      expect(dependencies[name]).toBe(
        name === 'jquery' ? '^3.7.1' : PEER_DEPENDENCIES[name],
      );
    }
  });

  it('leaves the build target untouched', async () => {
    const before = tree.read(PROJECT, 'utf-8');
    await run(tree, { scaffoldExample: true });
    expect(tree.read(PROJECT, 'utf-8')).toBe(before);
  });

  it.each([false, true])(
    'is idempotent with scaffoldExample %s',
    async (scaffoldExample) => {
      await run(tree, { scaffoldExample });
      const first = snapshot(tree);
      await run(tree, { scaffoldExample });
      expect(snapshot(tree)).toEqual(first);
    },
  );

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
    expect(snapshot(tree)).toEqual(before);
  });

  it('scaffolds the example component', async () => {
    await run(tree, { scaffoldExample: true });
    const content = tree.read(EXAMPLE, 'utf-8') ?? '';
    expect(content).toContain("selector: 'acme-bootstrap-table-example'");
    expect(content).toContain('imports: [TableComponent]');
    expect(content).toContain("from '@rn-forge/ng-bootstrap'");
    expect(content).toContain('<rnf-table [options]="options" />');
  });

  it('falls back to the rnf prefix', async () => {
    const other = createTreeWithEmptyWorkspace();
    createApp(other);
    await run(other, { scaffoldExample: true });
    expect(other.read(EXAMPLE, 'utf-8')).toContain(
      "selector: 'rnf-bootstrap-table-example'",
    );
  });

  it('adds no example by default', async () => {
    await run(tree);
    expect(tree.children(EXAMPLE_DIR)).toEqual([]);
    expect(tree.exists(EXAMPLE)).toBe(false);
  });

  it('keeps an existing example', async () => {
    tree.write(EXAMPLE, '// mine\n');
    await run(tree, { scaffoldExample: true });
    expect(tree.read(EXAMPLE, 'utf-8')).toBe('// mine\n');
  });

  it('returns an install callback unless skipInstall', async () => {
    expect(await run(tree)).toBeUndefined();

    const callback = await run(tree, { skipInstall: false });
    expect(callback).toBeTypeOf('function');
    callback?.();
    expect(devkit.installPackagesTask).toHaveBeenCalledWith(tree);
  });
});
