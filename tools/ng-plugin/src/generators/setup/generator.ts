import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  installPackagesTask,
  joinPathFragments,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addBootstrapProvider } from '../../utils/app-config';
import {
  findStylesheet,
  readAngularApplication,
} from '../../utils/angular-project';
import {
  addBootstrapTableDependencies,
  nonTablePeers,
} from '../../utils/bootstrap-table';
import { ensureThemeImport } from '../../utils/theme';
import { COMMONJS_DEPENDENCIES, LOCALIZE_POLYFILL } from '../../utils/versions';
import { SetupGeneratorSchema } from './schema';

function pluginVersion(): string {
  const manifest = join(__dirname, '../../../package.json');
  return JSON.parse(readFileSync(manifest, 'utf-8')).version;
}

function polyfillsWithLocalize(current: unknown): string[] {
  const list =
    typeof current === 'string'
      ? [current]
      : Array.isArray(current)
        ? [...current]
        : [];
  return list.includes(LOCALIZE_POLYFILL) ? list : [...list, LOCALIZE_POLYFILL];
}

/**
 * Configures an existing Angular application to consume `@rn-forge/ng` and
 * `@rn-forge/ng-bootstrap`: dependencies, theme import, build options and the
 * `provideRnForgeBootstrapConfig` provider. Returns the install callback
 * unless `skipInstall` is set.
 */
export default async function setupGenerator(
  tree: Tree,
  options: SetupGeneratorSchema,
): Promise<GeneratorCallback | undefined> {
  const config = readAngularApplication(tree, options.project);
  const version = `^${pluginVersion()}`;

  addDependenciesToPackageJson(
    tree,
    {
      '@rn-forge/ng': version,
      '@rn-forge/ng-bootstrap': version,
      ...nonTablePeers(),
    },
    {},
    undefined,
    true,
  );
  if (options.includeBootstrapTable !== false) {
    addBootstrapTableDependencies(tree);
  }

  if (!options.skipStyles && options.includeTheme !== false) {
    ensureThemeImport(tree, findStylesheet(tree, config));
  }

  if (!options.skipConfig) {
    const build = config.targets?.['build'];
    if (build) {
      const current = build.options ?? {};
      const allowed = [
        ...new Set([
          ...(current.allowedCommonJsDependencies ?? []),
          ...COMMONJS_DEPENDENCIES,
        ]),
      ].sort();
      const polyfills = polyfillsWithLocalize(current.polyfills);
      if (
        JSON.stringify(allowed) !==
          JSON.stringify(current.allowedCommonJsDependencies) ||
        JSON.stringify(polyfills) !== JSON.stringify(current.polyfills)
      ) {
        build.options = {
          ...current,
          allowedCommonJsDependencies: allowed,
          polyfills,
        };
        updateProjectConfiguration(tree, options.project, config);
      }
    }
    const sourceRoot =
      config.sourceRoot ?? joinPathFragments(config.root, 'src');
    addBootstrapProvider(
      tree,
      joinPathFragments(sourceRoot, 'app/app.config.ts'),
    );
  }

  await formatFiles(tree);

  return options.skipInstall
    ? undefined
    : () => installPackagesTask(tree, false, tree.root, options.packageManager);
}
