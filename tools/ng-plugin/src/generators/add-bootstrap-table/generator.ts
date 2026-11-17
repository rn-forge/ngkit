import {
  formatFiles,
  GeneratorCallback,
  installPackagesTask,
  joinPathFragments,
  logger,
  Tree,
} from '@nx/devkit';
import { readAngularApplication } from '../../utils/angular-project';
import { addBootstrapTableDependencies } from '../../utils/bootstrap-table';
import { AddBootstrapTableGeneratorSchema } from './schema';

function exampleComponent(selector: string): string {
  return `import { Component } from '@angular/core';
import { TableComponent, TableOptions } from '@rn-forge/ng-bootstrap';

@Component({
  selector: '${selector}',
  standalone: true,
  imports: [TableComponent],
  template: \`<rnf-table [options]="options" />\`,
})
export class BootstrapTableExampleComponent {
  options: Partial<TableOptions> = {
    columns: [
      { field: 'id', title: 'ID' },
      { field: 'name', title: 'Name' },
      { field: 'status', title: 'Status' },
    ],
    data: [
      { id: 1, name: 'Alice Johnson', status: 'Active' },
      { id: 2, name: 'Bob Smith', status: 'Pending' },
      { id: 3, name: 'Charlie Brown', status: 'Inactive' },
    ],
  };
}
`;
}

/**
 * Adds the Bootstrap Table dependencies (`bootstrap-table`, `jquery`,
 * `jquery-treegrid`) to an Angular application and, with `scaffoldExample`,
 * writes an example standalone component that renders `rnf-table`. Returns the
 * install callback unless `skipInstall` is set.
 */
export default async function addBootstrapTableGenerator(
  tree: Tree,
  options: AddBootstrapTableGeneratorSchema,
): Promise<GeneratorCallback | undefined> {
  const config = readAngularApplication(tree, options.project);
  addBootstrapTableDependencies(tree);

  if (options.scaffoldExample) {
    const sourceRoot =
      config.sourceRoot ?? joinPathFragments(config.root, 'src');
    const file = joinPathFragments(
      sourceRoot,
      'app/bootstrap-table-example/bootstrap-table-example.component.ts',
    );
    if (!tree.exists(file)) {
      const { prefix } = config as { prefix?: string };
      const selector = `${prefix ?? 'rnf'}-bootstrap-table-example`;
      tree.write(file, exampleComponent(selector));
      logger.info(`Added ${file} with selector <${selector}>.`);
    }
  }

  await formatFiles(tree);

  return options.skipInstall ? undefined : () => installPackagesTask(tree);
}
