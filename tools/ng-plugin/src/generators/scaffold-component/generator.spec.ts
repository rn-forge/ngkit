import { addProjectConfiguration, logger, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import scaffoldComponentGenerator from './generator';
import { ScaffoldComponentGeneratorSchema } from './schema';

const APP = 'apps/my-app/src/app/customer-grid';
const LIB = 'libs/my-lib/src/lib/customer-grid';
const INDEX = 'libs/my-lib/src/index.ts';

function createWorkspace(): Tree {
  const tree = createTreeWithEmptyWorkspace();
  addProjectConfiguration(tree, 'my-app', {
    root: 'apps/my-app',
    sourceRoot: 'apps/my-app/src',
    projectType: 'application',
    prefix: 'acme',
    targets: { build: { executor: '@angular/build:application' } },
  });
  addProjectConfiguration(tree, 'my-lib', {
    root: 'libs/my-lib',
    sourceRoot: 'libs/my-lib/src',
    projectType: 'library',
    targets: { build: { executor: '@nx/angular:package' } },
  });
  tree.write(INDEX, '');
  return tree;
}

const run = (
  tree: Tree,
  options: Partial<ScaffoldComponentGeneratorSchema> = {},
) =>
  scaffoldComponentGenerator(tree, {
    project: 'my-app',
    name: 'customer-grid',
    ...options,
  });

describe('scaffold-component generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createWorkspace();
    vi.restoreAllMocks();
  });

  it('writes a standalone component in an application', async () => {
    await run(tree);
    for (const ext of ['ts', 'html', 'scss', 'spec.ts']) {
      expect(tree.exists(`${APP}/customer-grid.component.${ext}`)).toBe(true);
    }
    const source = tree.read(`${APP}/customer-grid.component.ts`, 'utf-8');
    expect(source).toContain("selector: 'acme-customer-grid'");
    expect(source).toContain('standalone: true');
    expect(source).toContain('export class CustomerGridComponent');
    expect(source).toContain('templateUrl');
    expect(source).toContain('styleUrl');
    const spec = tree.read(`${APP}/customer-grid.component.spec.ts`, 'utf-8');
    expect(spec).toContain('CustomerGridComponent');
    expect(spec).toContain('creates the component');
  });

  it('exports from a library, once per component', async () => {
    await run(tree, { project: 'my-lib', export: true });
    await run(tree, { project: 'my-lib', export: true, name: 'other' });
    await expect(
      run(tree, { project: 'my-lib', export: true }),
    ).rejects.toThrow('already exists');
    const index = tree.read(INDEX, 'utf-8') ?? '';
    const line = "export * from './lib/customer-grid/customer-grid.component';";
    expect(index.split(line)).toHaveLength(2);
    expect(index).toContain("'./lib/other/other.component'");
    expect(tree.read(`${LIB}/customer-grid.component.ts`, 'utf-8')).toContain(
      "selector: 'rnf-customer-grid'",
    );
  });

  it('writes a page', async () => {
    await run(tree, { type: 'page' });
    const source = tree.read(`${APP}/customer-grid.page.ts`, 'utf-8');
    expect(source).toContain('CustomerGridPageComponent');
    expect(tree.read(`${APP}/customer-grid.page.html`, 'utf-8')).toContain(
      'Customer Grid',
    );
  });

  it('writes a table', async () => {
    await run(tree, { type: 'table' });
    expect(tree.read(`${APP}/customer-grid.component.ts`, 'utf-8')).toContain(
      'TableComponent',
    );
    expect(tree.read(`${APP}/customer-grid.component.html`, 'utf-8')).toContain(
      'rnf-table',
    );
  });

  it('writes a form', async () => {
    await run(tree, { type: 'form' });
    const source = tree.read(`${APP}/customer-grid.component.ts`, 'utf-8');
    expect(source).toContain('FormComponent');
    expect(source).toContain('InputFieldComponent');
    expect(source).toContain('@rn-forge/ng-bootstrap/form');
    expect(tree.read(`${APP}/customer-grid.component.html`, 'utf-8')).toContain(
      'rnf-form',
    );
  });

  it('writes under directory', async () => {
    await run(tree, { directory: 'features' });
    expect(
      tree.exists(
        'apps/my-app/src/features/customer-grid/customer-grid.component.ts',
      ),
    ).toBe(true);
  });

  it('skips the spec with withTest false', async () => {
    await run(tree, { withTest: false });
    expect(tree.exists(`${APP}/customer-grid.component.spec.ts`)).toBe(false);
  });

  it('writes a story only when Storybook is present', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    await run(tree, { project: 'my-lib', withStory: true });
    expect(tree.exists(`${LIB}/customer-grid.stories.ts`)).toBe(false);
    expect(warn).toHaveBeenCalled();

    addProjectConfiguration(tree, 'sb-lib', {
      root: 'libs/sb-lib',
      sourceRoot: 'libs/sb-lib/src',
      projectType: 'library',
      targets: {
        build: { executor: '@nx/angular:package' },
        storybook: { executor: '@storybook/angular:start-storybook' },
      },
    });
    await run(tree, { project: 'sb-lib', withStory: true });
    expect(
      tree.read(
        'libs/sb-lib/src/lib/customer-grid/customer-grid.stories.ts',
        'utf-8',
      ),
    ).toContain('component: CustomerGridComponent');
  });

  describe('refusals', () => {
    function expectUnchanged(before: Map<string, string>) {
      for (const [file, content] of before) {
        expect(tree.read(file, 'utf-8')).toBe(content);
      }
      expect(tree.exists(`${APP}/customer-grid.component.ts`)).toBe(false);
    }

    it('rejects export on an application', async () => {
      await expect(run(tree, { export: true })).rejects.toThrow(
        /--export.*library/,
      );
      expectUnchanged(new Map());
    });

    it('rejects an existing folder', async () => {
      tree.write(`${APP}/keep.txt`, 'keep');
      await expect(run(tree)).rejects.toThrow('customer-grid');
      expect(tree.read(`${APP}/keep.txt`, 'utf-8')).toBe('keep');
      expect(tree.exists(`${APP}/customer-grid.component.ts`)).toBe(false);
    });

    it('rejects a missing index.ts before any change', async () => {
      tree.delete(INDEX);
      await expect(
        run(tree, { project: 'my-lib', export: true }),
      ).rejects.toThrow('index.ts');
      expect(tree.exists(`${LIB}/customer-grid.component.ts`)).toBe(false);
    });

    it('rejects a non-Angular project', async () => {
      addProjectConfiguration(tree, 'js-lib', {
        root: 'libs/js-lib',
        sourceRoot: 'libs/js-lib/src',
        projectType: 'library',
        targets: { build: { executor: '@nx/js:tsc' } },
      });
      await expect(run(tree, { project: 'js-lib' })).rejects.toThrow(
        /Angular application or library.*js-lib|js-lib.*Angular application or library/,
      );
      expect(tree.exists('libs/js-lib/src/lib')).toBe(false);
    });
  });
});
