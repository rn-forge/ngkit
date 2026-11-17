import * as devkit from '@nx/devkit';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
  updateJson,
  writeJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import createLibraryGenerator from './generator';
import { CreateLibraryGeneratorSchema } from './schema';

vi.mock('@nx/devkit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nx/devkit')>()),
  installPackagesTask: vi.fn(),
}));

const libraryCallback = vi.hoisted(() => vi.fn());

vi.mock('@nx/angular/generators', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@nx/angular/generators')>();
  return {
    ...actual,
    libraryGenerator: async (
      ...args: Parameters<typeof actual.libraryGenerator>
    ) => {
      await actual.libraryGenerator(...args);
      return libraryCallback;
    },
  };
});

const BASE: CreateLibraryGeneratorSchema = {
  name: 'my-ui',
  importPath: '@acme/my-ui',
  skipInstall: true,
};
const REPOSITORY = { type: 'git', url: 'https://example.com/acme.git' };

function createTree(withRepository = true): Tree {
  const tree = createTreeWithEmptyWorkspace();
  writeJson(tree, 'package.json', {
    name: '@acme/source',
    license: 'MIT',
    ...(withRepository ? { repository: REPOSITORY } : {}),
    dependencies: { '@angular/core': '~22.2.5' },
    devDependencies: {},
  });
  return tree;
}

function snapshot(tree: Tree): Record<string, string | null> {
  return Object.fromEntries(
    tree.listChanges().map((c) => [c.path, c.content?.toString() ?? null]),
  );
}

describe('create-library', () => {
  describe('publishable library with secondary entry points', () => {
    let tree: Tree;
    let nxBefore: string;

    beforeAll(async () => {
      tree = createTree();
      nxBefore = tree.read('nx.json', 'utf-8') as string;
      await createLibraryGenerator(tree, {
        ...BASE,
        secondaryEntryPoints: 'auth, form,',
      });
    }, 120_000);

    it('creates a tagged project and its entry points', () => {
      const project = readProjectConfiguration(tree, 'my-ui');
      expect(project.root).toBe('libs/my-ui');
      expect(project.tags).toContain('publishable');
      expect(project.tags?.filter((t) => t === 'publishable')).toHaveLength(1);
      expect(tree.exists('libs/my-ui/auth/ng-package.json')).toBe(true);
      expect(tree.exists('libs/my-ui/form/ng-package.json')).toBe(true);
    });

    it('moves @angular packages into peerDependencies', () => {
      const pkg = readJson(tree, 'libs/my-ui/package.json');
      expect(pkg.peerDependencies['@angular/common']).toBeDefined();
      expect(pkg.dependencies?.['@angular/common']).toBeUndefined();
      expect(pkg.devDependencies?.['@angular/common']).toBeUndefined();
    });

    it('writes the package metadata', () => {
      const pkg = readJson(tree, 'libs/my-ui/package.json');
      expect(pkg.description).toBe('@acme/my-ui Angular library.');
      expect(pkg.license).toBe('MIT');
      expect(pkg.repository).toEqual({
        ...REPOSITORY,
        directory: 'libs/my-ui',
      });
      expect(pkg.publishConfig).toEqual({ access: 'public' });
    });

    it('writes the release settings and targets', () => {
      const project = readProjectConfiguration(tree, 'my-ui');
      expect(project.release?.version?.manifestRootsToUpdate).toEqual([
        '{projectRoot}',
        {
          path: 'dist/{projectRoot}',
          preserveLocalDependencyProtocols: false,
        },
      ]);
      expect(project.targets?.['pack']).toBeDefined();
      expect(project.targets?.['verify-dist']).toBeDefined();
      expect(project.targets?.['nx-release-publish']?.options).toEqual({
        packageRoot: 'dist/{projectRoot}',
        dryRun: true,
      });
    });

    it('excludes stories from tsconfig.spec.json', () => {
      const spec = readJson(tree, 'libs/my-ui/tsconfig.spec.json');
      expect(spec.exclude).toContain('**/*.stories.ts');
      expect(spec.exclude).toContain('**/*.stories.js');
    });

    it('keeps nx.json settings and adds no release.projects', () => {
      const before = JSON.parse(nxBefore);
      const after = readJson(tree, 'nx.json');
      expect(after.affected).toEqual(before.affected);
      expect(after.targetDefaults.build).toEqual(before.targetDefaults.build);
      expect(after.targetDefaults.lint).toEqual(before.targetDefaults.lint);
      expect(after.release?.projects).toBeUndefined();
    });

    it('defaults the coverage threshold to 35', () => {
      const test = readProjectConfiguration(tree, 'my-ui').targets?.['test'];
      expect(test?.options.coverage).toBe(true);
      expect(test?.options.coverageThresholds).toEqual({
        statements: 35,
        branches: 35,
        functions: 35,
        lines: 35,
      });
    });

    it('adds no Storybook or Compodoc without the flags', () => {
      const project = readProjectConfiguration(tree, 'my-ui');
      expect(project.targets?.['build-storybook']).toBeUndefined();
      expect(project.targets?.['compodoc']).toBeUndefined();
      expect(tree.exists('libs/my-ui/.storybook/main.ts')).toBe(false);
      expect(
        readJson(tree, 'package.json').devDependencies['@storybook/angular'],
      ).toBeUndefined();
    });
  });

  it('keeps an existing release.projects exactly', async () => {
    const tree = createTree();
    updateJson(tree, 'nx.json', (nx) => ({
      ...nx,
      release: { projects: ['tag:publishable'] },
    }));
    await createLibraryGenerator(tree, BASE);
    expect(readJson(tree, 'nx.json').release.projects).toEqual([
      'tag:publishable',
    ]);
  }, 120_000);

  it('adds Storybook with storybook: true', async () => {
    const tree = createTree();
    await createLibraryGenerator(tree, { ...BASE, storybook: true });
    const target = readProjectConfiguration(tree, 'my-ui').targets?.[
      'build-storybook'
    ];
    expect(target?.options.outputDir).toBe('dist/storybook/my-ui');
    expect(tree.exists('libs/my-ui/.storybook/main.ts')).toBe(true);
    expect(tree.exists('libs/my-ui/.storybook/preview.ts')).toBe(true);
    expect(tree.exists('libs/my-ui/.storybook/tsconfig.json')).toBe(true);
    const dev = readJson(tree, 'package.json').devDependencies;
    expect(dev['@storybook/angular']).toBeDefined();
    expect(dev['storybook']).toBeDefined();
  }, 120_000);

  it('adds Compodoc with compodoc: true', async () => {
    const tree = createTree();
    await createLibraryGenerator(tree, { ...BASE, compodoc: true });
    const target = readProjectConfiguration(tree, 'my-ui').targets?.[
      'compodoc'
    ];
    expect(target?.options.outputPath).toBe('dist/compodoc/my-ui');
    expect(tree.exists('libs/my-ui/tsconfig.compodoc.json')).toBe(true);
    const dev = readJson(tree, 'package.json').devDependencies;
    expect(dev['@twittwer/compodoc']).toBeDefined();
    expect(dev['@compodoc/compodoc']).toBeDefined();
  }, 120_000);

  it('uses coverageThreshold for the four thresholds', async () => {
    const tree = createTree();
    await createLibraryGenerator(tree, { ...BASE, coverageThreshold: 80 });
    const test = readProjectConfiguration(tree, 'my-ui').targets?.['test'];
    expect(test?.options.coverageThresholds).toEqual({
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    });
  }, 120_000);

  it('refuses an existing project and changes nothing', async () => {
    const tree = createTree();
    devkit.addProjectConfiguration(tree, 'my-ui', { root: 'libs/my-ui' });
    const before = snapshot(tree);
    await expect(createLibraryGenerator(tree, BASE)).rejects.toThrow(/my-ui/);
    expect(getProjects(tree).size).toBe(1);
    expect(snapshot(tree)).toEqual(before);
  });

  describe('without a root repository', () => {
    it('omits repository and warns', async () => {
      const warn = vi
        .spyOn(devkit.logger, 'warn')
        .mockImplementation(() => undefined);
      const tree = createTree(false);
      await createLibraryGenerator(tree, BASE);
      expect(readJson(tree, 'libs/my-ui/package.json').repository).toBe(
        undefined,
      );
      expect(warn).toHaveBeenCalled();
    }, 120_000);
  });

  describe('install callback', () => {
    beforeEach(() => {
      vi.mocked(devkit.installPackagesTask).mockClear();
      libraryCallback.mockClear();
    });

    it('returns undefined with skipInstall', async () => {
      const result = await createLibraryGenerator(createTree(), BASE);
      expect(result).toBeUndefined();
    }, 120_000);

    it('returns a callback that installs packages', async () => {
      const result = await createLibraryGenerator(createTree(), {
        ...BASE,
        skipInstall: false,
      });
      expect(typeof result).toBe('function');
      await (result as () => unknown)();
      expect(libraryCallback).toHaveBeenCalled();
      expect(devkit.installPackagesTask).toHaveBeenCalled();
    }, 120_000);
  });
});
