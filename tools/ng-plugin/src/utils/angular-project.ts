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
