import { logger, Tree } from '@nx/devkit';

const THEME_IMPORT = /@use\s+['"]@rn-forge\/ng-bootstrap\/assets\/theme['"]/;
const USE_LINE = "@use '@rn-forge/ng-bootstrap/assets/theme';";
const START = '// rn-forge:start';
const END = '// rn-forge:end';

/**
 * Imports the rn-forge theme into the SCSS file at `path`, inside the
 * `rn-forge:start` and `rn-forge:end` markers. Changes nothing when the file
 * already imports the theme; warns and skips a missing or non-SCSS file. With
 * `force` and both markers present, replaces everything between them with the
 * plain import.
 */
export function ensureThemeImport(
  tree: Tree,
  path: string | undefined,
  { force = false }: { force?: boolean } = {},
): void {
  if (!path?.endsWith('.scss') || !tree.exists(path)) {
    logger.warn(
      `Skipped the theme import: ${path ?? 'no stylesheet'} is not an existing SCSS file.`,
    );
    return;
  }
  const content = tree.read(path, 'utf-8') ?? '';
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  if (force && start !== -1 && end > start) {
    tree.write(
      path,
      `${content.slice(0, start + START.length)}\n${USE_LINE}\n${content.slice(end)}`,
    );
    return;
  }
  if (THEME_IMPORT.test(content)) {
    return;
  }
  if (start !== -1 && end > start) {
    tree.write(
      path,
      `${content.slice(0, end)}${USE_LINE}\n${content.slice(end)}`,
    );
    return;
  }
  tree.write(path, `${START}\n${USE_LINE}\n${END}\n${content}`);
}
