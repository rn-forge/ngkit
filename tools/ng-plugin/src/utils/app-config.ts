import { logger, Tree } from '@nx/devkit';
import * as ts from 'typescript';

const PROVIDER = 'provideRnForgeBootstrapConfig';
const PACKAGE = '@rn-forge/ng-bootstrap';

function findProviders(
  source: ts.SourceFile,
): ts.ArrayLiteralExpression | undefined {
  let found: ts.ArrayLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (
      !found &&
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === 'providers' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      found = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function isImported(source: ts.SourceFile): boolean {
  return source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) => element.name.text === PROVIDER,
      ),
  );
}

/**
 * Appends `provideRnForgeBootstrapConfig({})` to the `providers` array in the
 * `app.config.ts` at `path`, and imports it. Changes nothing when a provider
 * call is already present; warns and skips a missing file or `providers` array.
 */
export function addBootstrapProvider(tree: Tree, path: string): void {
  if (!tree.exists(path)) {
    logger.warn(`Skipped the provider: ${path} does not exist.`);
    return;
  }
  const text = tree.read(path, 'utf-8') ?? '';
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const providers = findProviders(source);
  if (!providers) {
    logger.warn(`Skipped the provider: no providers array in ${path}.`);
    return;
  }
  if (
    providers.elements.some((element) =>
      element.getText(source).includes(`${PROVIDER}(`),
    )
  ) {
    return;
  }
  const call = `${PROVIDER}({})`;
  const last = providers.elements[providers.elements.length - 1];
  let updated: string;
  if (last) {
    const comma = providers.elements.hasTrailingComma ? '' : ',';
    const separator = text
      .slice(last.getEnd(), providers.getEnd() - 1)
      .includes('\n')
      ? '\n    '
      : ' ';
    updated = `${text.slice(0, last.getEnd())}${comma}${separator}${call}${text.slice(last.getEnd())}`;
  } else {
    updated = `${text.slice(0, providers.getStart() + 1)}${call}${text.slice(providers.getStart() + 1)}`;
  }
  if (!isImported(source)) {
    const line = `import { ${PROVIDER} } from '${PACKAGE}';`;
    const lastImport = source.statements.filter(ts.isImportDeclaration).pop();
    updated = lastImport
      ? `${updated.slice(0, lastImport.getEnd())}\n${line}${updated.slice(lastImport.getEnd())}`
      : `${line}\n${updated}`;
  }
  tree.write(path, updated);
}
