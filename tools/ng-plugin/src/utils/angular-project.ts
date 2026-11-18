import {
  joinPathFragments,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';

const BUILD_EXECUTORS = [
  '@angular/build:application',
  '@angular-devkit/build-angular:application',
  '@angular-devkit/build-angular:browser',
  '@nx/angular:application',
  '@nx/angular:browser-esbuild',
];

const LIBRARY_BUILD_EXECUTORS = [
  '@nx/angular:package',
  '@nx/angular:ng-packagr-lite',
  '@angular/build:ng-packagr',
  '@angular-devkit/build-angular:ng-packagr',
];

/**
 * Reads `project` and throws unless it is an Angular application, meaning an
 * application project whose `build` target uses an Angular builder.
 */
export function readAngularApplication(
  tree: Tree,
  project: string,
): ProjectConfiguration {
  let config: ProjectConfiguration | undefined;
  try {
    config = readProjectConfiguration(tree, project);
  } catch {
    config = undefined;
  }
  const executor = config?.targets?.['build']?.executor;
  if (
    config?.projectType !== 'application' ||
    !executor ||
    !BUILD_EXECUTORS.includes(executor)
  ) {
    throw new Error(`Project "${project}" is not an Angular application.`);
  }
  return config;
}

/**
 * Reads `project` and throws unless it is an Angular application (as
 * `readAngularApplication` accepts) or a library built with an Angular
 * packaging executor.
 */
export function readAngularProject(
  tree: Tree,
  project: string,
): ProjectConfiguration {
  let config: ProjectConfiguration | undefined;
  try {
    config = readProjectConfiguration(tree, project);
  } catch {
    config = undefined;
  }
  const executor = config?.targets?.['build']?.executor;
  const accepted =
    config?.projectType === 'library'
      ? LIBRARY_BUILD_EXECUTORS
      : BUILD_EXECUTORS;
  if (
    !config ||
    (config.projectType !== 'application' &&
      config.projectType !== 'library') ||
    !executor ||
    !accepted.includes(executor)
  ) {
    throw new Error(
      `Project "${project}" is not an Angular application or library.`,
    );
  }
  return config;
}

/** The first SCSS stylesheet in the build target's `styles`, else `<sourceRoot>/styles.scss` when it exists. */
export function findStylesheet(
  tree: Tree,
  config: ProjectConfiguration,
): string | undefined {
  const styles: unknown[] = config.targets?.['build']?.options?.styles ?? [];
  for (const entry of styles) {
    const input =
      typeof entry === 'string' ? entry : (entry as { input?: string }).input;
    if (input?.endsWith('.scss')) {
      return input;
    }
  }
  const fallback = joinPathFragments(
    config.sourceRoot ?? joinPathFragments(config.root, 'src'),
    'styles.scss',
  );
  return tree.exists(fallback) ? fallback : undefined;
}
