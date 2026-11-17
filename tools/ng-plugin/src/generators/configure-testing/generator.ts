import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  installPackagesTask,
  joinPathFragments,
  offsetFromRoot,
  readJson,
  Tree,
  updateProjectConfiguration,
  writeJson,
} from '@nx/devkit';
import { readAngularProject } from '../../utils/angular-project';
import { VITEST_DEPENDENCIES } from '../../utils/versions';
import { ConfigureTestingGeneratorSchema } from './schema';

const UNIT_TEST_EXECUTOR = '@nx/angular:unit-test';
const SPEC_INCLUDE = ['src/**/*.ts', 'src/**/*.d.ts'];
const SPEC_EXCLUDE = ['**/*.stories.ts', '**/*.stories.js'];
const VITEST_TYPES = 'vitest/globals';

function withEntries(current: unknown, entries: string[]): string[] {
  const list: string[] = Array.isArray(current) ? [...current] : [];
  return [...list, ...entries.filter((entry) => !list.includes(entry))];
}

function writeSpecConfig(tree: Tree, root: string): void {
  const path = joinPathFragments(root, 'tsconfig.spec.json');
  if (!tree.exists(path)) {
    writeJson(tree, path, {
      extends: './tsconfig.json',
      compilerOptions: {
        outDir: joinPathFragments(offsetFromRoot(root), 'dist/out-tsc'),
        types: [VITEST_TYPES],
      },
      include: SPEC_INCLUDE,
      exclude: SPEC_EXCLUDE,
    });
    return;
  }
  const json = readJson(tree, path);
  const next = {
    ...json,
    compilerOptions: {
      ...json.compilerOptions,
      types: withEntries(json.compilerOptions?.types, [VITEST_TYPES]),
    },
    include: withEntries(json.include, SPEC_INCLUDE),
    exclude: withEntries(json.exclude, SPEC_EXCLUDE),
  };
  if (JSON.stringify(next) !== JSON.stringify(json)) {
    writeJson(tree, path, next);
  }
}

/**
 * Sets an Angular project's Vitest `@nx/angular:unit-test` target to
 * rn-forge's coverage defaults, patches its `tsconfig.spec.json` and declares
 * the Vitest devDependencies. Throws for a `test` target with another
 * executor. Returns the install callback unless `skipInstall` is set.
 */
export default async function configureTestingGenerator(
  tree: Tree,
  options: ConfigureTestingGeneratorSchema,
): Promise<GeneratorCallback | undefined> {
  const config = readAngularProject(tree, options.project);
  const existing = config.targets?.['test'];
  if (existing && existing.executor !== UNIT_TEST_EXECUTOR) {
    throw new Error(
      `Project "${options.project}" has a "test" target using "${existing.executor}"; only ${UNIT_TEST_EXECUTOR} (Vitest Angular) is supported.`,
    );
  }

  const threshold = options.coverageThreshold ?? 35;
  const reporters = (options.reporters ?? 'text,html,json')
    .split(',')
    .map((reporter) => reporter.trim());
  const base = existing ?? {
    executor: UNIT_TEST_EXECUTOR,
    options: {
      tsConfig: joinPathFragments(config.root, 'tsconfig.spec.json'),
      watch: false,
    },
  };
  const target = {
    ...base,
    options: {
      ...base.options,
      coverage: true,
      coverageReporters: reporters,
      coverageThresholds: {
        statements: threshold,
        branches: threshold,
        functions: threshold,
        lines: threshold,
      },
    },
  };
  if (JSON.stringify(target) !== JSON.stringify(existing)) {
    config.targets = { ...config.targets, test: target };
    updateProjectConfiguration(tree, options.project, config);
  }

  writeSpecConfig(tree, config.root);
  addDependenciesToPackageJson(tree, {}, VITEST_DEPENDENCIES, undefined, true);
  await formatFiles(tree);

  return options.skipInstall ? undefined : () => installPackagesTask(tree);
}
