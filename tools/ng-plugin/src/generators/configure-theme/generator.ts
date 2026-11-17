import { formatFiles, Tree } from '@nx/devkit';
import {
  findStylesheet,
  readAngularApplication,
} from '../../utils/angular-project';
import { ensureThemeImport } from '../../utils/theme';
import { ConfigureThemeGeneratorSchema } from './schema';

/**
 * Imports the rn-forge Bootstrap theme into the SCSS stylesheet of an Angular
 * application, inside the `rn-forge` markers. Throws when the project is not an
 * Angular application or no SCSS stylesheet can be resolved, before any change.
 */
export default async function configureThemeGenerator(
  tree: Tree,
  options: ConfigureThemeGeneratorSchema,
): Promise<void> {
  const config = readAngularApplication(tree, options.project);
  let stylesheet = options.stylesheet;
  if (stylesheet) {
    if (!stylesheet.endsWith('.scss') || !tree.exists(stylesheet)) {
      throw new Error(`"${stylesheet}" is not an existing SCSS file.`);
    }
  } else {
    stylesheet = findStylesheet(tree, config);
    if (!stylesheet) {
      throw new Error(
        `Project "${options.project}" has no SCSS stylesheet; pass --stylesheet.`,
      );
    }
  }
  ensureThemeImport(tree, stylesheet, { force: options.force });
  await formatFiles(tree);
}
