import { logger, Tree } from '@nx/devkit';

const THEME_IMPORT = /@use\s+['"]@rn-forge\/ng-bootstrap\/assets\/theme['"]/;
const USE_LINE = "@use '@rn-forge/ng-bootstrap/assets/theme';";
const START = '// rn-forge:start';
const END = '// rn-forge:end';

/**
 * Imports the rn-forge theme into the SCSS file at `path`, inside the
 * `rn-forge:start` and `rn-forge:end` markers. Changes nothing when the file
 * already imports the theme; warns and skips a missing or non-SCSS file.
 */
export function ensureThemeImport(tree: Tree, path: string | undefined): void {
  if (!path?.endsWith('.scss') || !tree.exists(path)) {
    logger.warn(
      `Skipped the theme import: ${path ?? 'no stylesheet'} is not an existing SCSS file.`,
    );
    return;
  }
  const content = tree.read(path, 'utf-8') ?? '';
  if (THEME_IMPORT.test(content)) {
    return;
  }
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  if (start !== -1 && end > start) {
    tree.write(
      path,
      `${content.slice(0, end)}${USE_LINE}\n${content.slice(end)}`,
    );
    return;
  }
  tree.write(path, `${START}\n${USE_LINE}\n${END}\n${content}`);
}
