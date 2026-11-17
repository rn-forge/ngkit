import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  getProjects,
  installPackagesTask,
  joinPathFragments,
  logger,
  readJson,
  readNxJson,
  readProjectConfiguration,
  Tree,
  updateJson,
  updateNxJson,
  updateProjectConfiguration,
  writeJson,
} from '@nx/devkit';
import {
  libraryGenerator,
  librarySecondaryEntryPointGenerator,
} from '@nx/angular/generators';
import { COMPODOC_DEPENDENCIES, STORYBOOK_VERSION } from '../../utils/versions';
import { CreateLibraryGeneratorSchema } from './schema';

const STORYBOOK_MAIN = `import type { StorybookConfig } from '@storybook/angular';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const config: StorybookConfig = {
  stories: ['../**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: [],
  framework: {
    name: getAbsolutePath('@storybook/angular'),
    options: {},
  },
};

export default config;

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(\`\${value}/package.json\`)));
}
`;

const STORYBOOK_PREVIEW = `const preview = {};

export default preview;
`;

const STORYBOOK_TSCONFIG = {
  extends: '../tsconfig.json',
  compilerOptions: { emitDecoratorMetadata: true },
  exclude: ['../**/*.spec.ts'],
  include: [
    '../**/*.stories.ts',
    '../**/*.stories.js',
    '../**/*.stories.jsx',
    '../**/*.stories.tsx',
    '../**/*.stories.mdx',
    '../src/**/*.ts',
    '*.js',
    'main.ts',
    'preview.ts',
  ],
};

function restoreReleaseProjects(tree: Tree, before: unknown): void {
  const nx = readNxJson(tree);
  if (!nx?.release) return;
  if (before === undefined) delete nx.release.projects;
  else nx.release.projects = before as never;
  updateNxJson(tree, nx);
}

function movePeers(tree: Tree, packageJson: string): void {
  updateJson(tree, packageJson, (pkg) => {
    const peers: Record<string, string> = pkg.peerDependencies ?? {};
    for (const key of ['dependencies', 'devDependencies']) {
      const group: Record<string, string> | undefined = pkg[key];
      if (!group) continue;
      for (const [dep, range] of Object.entries(group)) {
        if (!dep.startsWith('@angular/')) continue;
        peers[dep] ??= range;
        delete group[dep];
      }
      if (Object.keys(group).length === 0) delete pkg[key];
    }
    if (Object.keys(peers).length > 0) pkg.peerDependencies = peers;
    return pkg;
  });
}

function writeMetadata(
  tree: Tree,
  packageJson: string,
  root: string,
  options: CreateLibraryGeneratorSchema,
): void {
  const rootPkg = readJson(tree, 'package.json');
  updateJson(tree, packageJson, (pkg) => {
    pkg.description ||= `${options.importPath} Angular library.`;
    pkg.license = rootPkg.license ?? 'MIT';
    if (rootPkg.repository) {
      const repository =
        typeof rootPkg.repository === 'string'
          ? { type: 'git', url: rootPkg.repository }
          : rootPkg.repository;
      pkg.repository = { ...repository, directory: root };
    } else {
      logger.warn(
        `No repository in the root package.json; add repository to ${packageJson} by hand.`,
      );
    }
    pkg.publishConfig = { ...pkg.publishConfig, access: 'public' };
    return pkg;
  });
}

function writeProjectSettings(
  tree: Tree,
  options: CreateLibraryGeneratorSchema,
): void {
  const { name } = options;
  const threshold = options.coverageThreshold ?? 35;
  const project = readProjectConfiguration(tree, name);
  const root = project.root;
  const targets = (project.targets ??= {});

  project.tags = [...new Set([...(project.tags ?? []), 'publishable'])];
  project.release = {
    ...project.release,
    version: {
      ...project.release?.version,
      manifestRootsToUpdate: [
        '{projectRoot}',
        {
          path: 'dist/{projectRoot}',
          preserveLocalDependencyProtocols: false,
        },
      ],
    },
  };
  targets['pack'] = {};
  targets['verify-dist'] = {};
  targets['nx-release-publish'] = {
    options: { packageRoot: 'dist/{projectRoot}', dryRun: true },
  };
  const test = (targets['test'] ??= {});
  test.options = {
    ...test.options,
    coverage: true,
    coverageThresholds: {
      statements: threshold,
      branches: threshold,
      functions: threshold,
      lines: threshold,
    },
  };

  if (options.storybook) {
    const configDir = joinPathFragments(root, '.storybook');
    targets['build-storybook'] = {
      executor: '@storybook/angular:build-storybook',
      options: {
        configDir,
        tsConfig: joinPathFragments(configDir, 'tsconfig.json'),
        outputDir: `dist/storybook/${name}`,
      },
      configurations: { production: {} },
    };
  }
  if (options.compodoc) {
    targets['compodoc'] = {
      executor: '@twittwer/compodoc:compodoc',
      outputs: [`{workspaceRoot}/dist/compodoc/${name}`],
      options: {
        tsConfig: joinPathFragments(root, 'tsconfig.compodoc.json'),
        outputPath: `dist/compodoc/${name}`,
      },
      configurations: {
        json: { exportFormat: 'json' },
        serve: { serve: true, watch: true },
      },
    };
  }
  updateProjectConfiguration(tree, name, project);
}

function writeStorybook(tree: Tree, root: string): void {
  const dir = joinPathFragments(root, '.storybook');
  tree.write(joinPathFragments(dir, 'main.ts'), STORYBOOK_MAIN);
  tree.write(joinPathFragments(dir, 'preview.ts'), STORYBOOK_PREVIEW);
  writeJson(tree, joinPathFragments(dir, 'tsconfig.json'), STORYBOOK_TSCONFIG);
  addDependenciesToPackageJson(
    tree,
    {},
    { storybook: STORYBOOK_VERSION, '@storybook/angular': STORYBOOK_VERSION },
    undefined,
    true,
  );
}

function writeCompodoc(tree: Tree, root: string): void {
  writeJson(tree, joinPathFragments(root, 'tsconfig.compodoc.json'), {
    extends: './tsconfig.lib.json',
    compilerOptions: { emitDecoratorMetadata: true },
  });
  addDependenciesToPackageJson(
    tree,
    {},
    { ...COMPODOC_DEPENDENCIES },
    undefined,
    true,
  );
}

/**
 * Scaffolds a publishable Angular library through `@nx/angular`, then applies
 * the peer, metadata, release, coverage and optional Storybook and Compodoc
 * settings, leaving `nx.json#release.projects` as it was. Refuses an existing project. Returns the install callback unless
 * `skipInstall` is set.
 */
export default async function createLibraryGenerator(
  tree: Tree,
  options: CreateLibraryGeneratorSchema,
): Promise<GeneratorCallback | undefined> {
  const { name, importPath } = options;
  if (getProjects(tree).has(name)) {
    throw new Error(`Project "${name}" already exists.`);
  }

  const projectsBefore = readNxJson(tree)?.release?.projects;

  const libraryCallback = await libraryGenerator(tree, {
    name,
    directory: options.directory ?? `libs/${name}`,
    importPath,
    publishable: true,
    standalone: true,
    strict: true,
    style: 'scss',
    unitTestRunner: 'vitest-angular',
    linter: 'eslint',
    skipFormat: true,
  } as Parameters<typeof libraryGenerator>[1]);

  restoreReleaseProjects(tree, projectsBefore);

  const entryPoints = (options.secondaryEntryPoints ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const entry of entryPoints) {
    await librarySecondaryEntryPointGenerator(tree, {
      name: entry,
      library: name,
      skipFormat: true,
    });
  }

  const root = readProjectConfiguration(tree, name).root;
  const packageJson = joinPathFragments(root, 'package.json');
  movePeers(tree, packageJson);
  writeMetadata(tree, packageJson, root, options);
  writeProjectSettings(tree, options);

  const specConfig = joinPathFragments(root, 'tsconfig.spec.json');
  updateJson(tree, specConfig, (config) => {
    const exclude: string[] = config.exclude ?? [];
    for (const pattern of ['**/*.stories.ts', '**/*.stories.js']) {
      if (!exclude.includes(pattern)) exclude.push(pattern);
    }
    config.exclude = exclude;
    return config;
  });

  if (options.storybook) writeStorybook(tree, root);
  if (options.compodoc) writeCompodoc(tree, root);

  await formatFiles(tree);

  return options.skipInstall
    ? undefined
    : async () => {
        await libraryCallback();
        installPackagesTask(tree);
      };
}
