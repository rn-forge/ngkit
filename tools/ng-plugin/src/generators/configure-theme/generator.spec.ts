import { addProjectConfiguration, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import configureThemeGenerator from './generator';
import { ConfigureThemeGeneratorSchema } from './schema';

const STYLES = 'apps/my-app/src/styles.scss';
const USE = "@use '@rn-forge/ng-bootstrap/assets/theme';";
const BLOCK = `// rn-forge:start\n${USE}\n// rn-forge:end\n`;
const BODY = 'body {\n  margin: 0;\n}\n';

function createApp(tree: Tree, styles: string[] = [STYLES]): void {
  addProjectConfiguration(tree, 'my-app', {
    root: 'apps/my-app',
    sourceRoot: 'apps/my-app/src',
    projectType: 'application',
    targets: {
      build: {
        executor: '@angular/build:application',
        options: { styles },
      },
    },
  });
}

function run(
  tree: Tree,
  options: Partial<ConfigureThemeGeneratorSchema> = {},
): Promise<void> {
  return configureThemeGenerator(tree, { project: 'my-app', ...options });
}

function read(tree: Tree, path = STYLES): string {
  return tree.read(path, 'utf-8') ?? '';
}

describe('configure-theme generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    createApp(tree);
    tree.write(STYLES, BODY);
  });

  it('adds the marked block at the top and keeps the content', async () => {
    await run(tree);
    const content = read(tree);
    expect(content.startsWith(BLOCK)).toBe(true);
    expect(content).toContain('body {');
  });

  it('is idempotent', async () => {
    await run(tree);
    const first = read(tree);
    await run(tree);
    expect(read(tree)).toBe(first);
    expect(first.split(USE)).toHaveLength(2);
  });

  it.each([false, true])(
    'leaves an unmarked import alone (force=%s)',
    async (force) => {
      const content = `${USE}\n${BODY}`;
      tree.write(STYLES, content);
      await run(tree, { force });
      expect(read(tree)).toBe(content);
    },
  );

  describe('force', () => {
    const custom = `// rn-forge:start\n@use '@rn-forge/ng-bootstrap/assets/theme' with ($primary: #000);\n// rn-forge:end\n${BODY}`;

    it('resets the marked region to the plain import', async () => {
      tree.write(STYLES, custom);
      await run(tree, { force: true });
      expect(read(tree)).toBe(`${BLOCK}${BODY}`);
    });

    it('keeps the region without force', async () => {
      tree.write(STYLES, custom);
      await run(tree);
      expect(read(tree)).toBe(custom);
    });
  });

  it('patches an explicit stylesheet and not the build styles', async () => {
    const theme = 'apps/my-app/src/theme.scss';
    tree.write(theme, BODY);
    await run(tree, { stylesheet: theme });
    expect(read(tree, theme).startsWith(BLOCK)).toBe(true);
    expect(read(tree)).toBe(BODY);
  });

  it.each(['apps/my-app/src/missing.scss', 'apps/my-app/src/plain.css'])(
    'rejects the bad stylesheet %s',
    async (stylesheet) => {
      tree.write('apps/my-app/src/plain.css', 'a {}\n');
      await expect(run(tree, { stylesheet })).rejects.toThrow(stylesheet);
      expect(read(tree)).toBe(BODY);
      expect(read(tree, 'apps/my-app/src/plain.css')).toBe('a {}\n');
    },
  );

  it('throws when no SCSS stylesheet is found', async () => {
    const empty = createTreeWithEmptyWorkspace();
    createApp(empty, []);
    await expect(run(empty)).rejects.toThrow('no SCSS stylesheet');
  });

  it('rejects a project that is not an Angular application', async () => {
    addProjectConfiguration(tree, 'my-lib', {
      root: 'libs/my-lib',
      projectType: 'library',
      targets: {},
    });
    await expect(run(tree, { project: 'my-lib' })).rejects.toThrow(
      'Angular application',
    );
    expect(read(tree)).toBe(BODY);
  });
});
