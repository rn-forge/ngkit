import {
  formatFiles,
  joinPathFragments,
  logger,
  names,
  ProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { readAngularProject } from '../../utils/angular-project';
import { ScaffoldComponentGeneratorSchema } from './schema';

type ComponentType = NonNullable<ScaffoldComponentGeneratorSchema['type']>;

interface Shape {
  imports: string;
  importLines: string[];
  members: string;
  html: (file: string, className: string) => string;
}

const SHAPES: Record<ComponentType, Shape> = {
  component: {
    imports: '[]',
    importLines: [],
    members: '',
    html: (file) => `<p>${file} works</p>\n`,
  },
  page: {
    imports: '[]',
    importLines: [],
    members: '',
    html: (_file, className) =>
      `<div class="container py-4">\n  <h4 class="mb-1">${className
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim()}</h4>\n</div>\n`,
  },
  table: {
    imports: '[TableComponent]',
    importLines: [
      "import { TableComponent, TableOptions } from '@rn-forge/ng-bootstrap';",
    ],
    members: `
  options: Partial<TableOptions> = {
    columns: [
      { field: 'id', title: 'ID' },
      { field: 'name', title: 'Name' },
    ],
    data: [],
  };
`,
    html: () => '<rnf-table [options]="options" />\n',
  },
  form: {
    imports: '[FormComponent, InputFieldComponent]',
    importLines: [
      "import {\n  FormComponent,\n  FormOptions,\n  InputFieldComponent,\n} from '@rn-forge/ng-bootstrap/form';",
    ],
    members: `
  formOptions: Partial<FormOptions> = {
    controls: { name: [''] },
    submitBtn: 'Submit',
  };
`,
    html: () =>
      `<rnf-form [options]="formOptions" [template]="fields" />

<ng-template #fields let-ctx>
  <rnf-input-field name="name" label="Name" [formGroup]="ctx.formGroup" />
</ng-template>
`,
  },
};

function componentSource(
  shape: Shape,
  selector: string,
  className: string,
  stem: string,
): string {
  const lines = [
    "import { Component } from '@angular/core';",
    ...shape.importLines,
  ];
  return `${lines.join('\n')}

@Component({
  selector: '${selector}',
  standalone: true,
  imports: ${shape.imports},
  templateUrl: './${stem}.html',
  styleUrl: './${stem}.scss',
})
export class ${className} {${shape.members}}
`;
}

function specSource(className: string, stem: string): string {
  return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${className} } from './${stem}';

describe('${className}', () => {
  let component: ${className};
  let fixture: ComponentFixture<${className}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}],
    });
    fixture = TestBed.createComponent(${className});
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });
});
`;
}

function storySource(
  className: string,
  baseName: string,
  stem: string,
): string {
  return `import { type Meta, type StoryObj } from '@storybook/angular';
import { ${className} } from './${stem}';

const meta: Meta<${className}> = {
  title: '${baseName}',
  component: ${className},
};
export default meta;

export const Default: StoryObj<${className}> = {};
`;
}

function hasStorybook(tree: Tree, config: ProjectConfiguration): boolean {
  const targets = config.targets ?? {};
  return (
    'storybook' in targets ||
    'build-storybook' in targets ||
    tree.exists(joinPathFragments(config.root, '.storybook'))
  );
}

/**
 * Writes a standalone component of the chosen `type` in its own folder in an
 * Angular application or library, with an optional spec and Storybook story,
 * and with `export` appends it to the library's public API. Refuses `export`
 * on an application, an existing folder and a missing `index.ts` before it
 * changes anything.
 */
export default async function scaffoldComponentGenerator(
  tree: Tree,
  options: ScaffoldComponentGeneratorSchema,
): Promise<void> {
  const config = readAngularProject(tree, options.project);
  const isApp = config.projectType === 'application';
  const type: ComponentType = options.type ?? 'component';
  const sourceRoot = config.sourceRoot ?? joinPathFragments(config.root, 'src');

  if (options.export && isApp) {
    throw new Error(
      `--export is only valid for a library; "${options.project}" is an application.`,
    );
  }

  const {
    fileName,
    className: baseClass,
    className: baseName,
  } = names(options.name);
  const suffix = type === 'page' ? 'page' : 'component';
  const className = `${baseClass}${type === 'page' ? 'Page' : ''}Component`;
  const base = joinPathFragments(
    sourceRoot,
    options.directory ?? (isApp ? 'app' : 'lib'),
  );
  const folder = joinPathFragments(base, fileName);
  const stem = `${fileName}.${suffix}`;

  if (tree.exists(folder)) {
    throw new Error(`The folder "${folder}" already exists.`);
  }

  const indexPath = joinPathFragments(sourceRoot, 'index.ts');
  const exportLine = `export * from './${joinPathFragments(base, fileName, stem).slice(sourceRoot.length + 1)}';`;
  if (options.export && !tree.exists(indexPath)) {
    throw new Error(`The public API file "${indexPath}" does not exist.`);
  }

  const { prefix } = config as { prefix?: string };
  const selector = `${prefix ?? 'rnf'}-${fileName}`;
  const shape = SHAPES[type];

  tree.write(
    joinPathFragments(folder, `${stem}.ts`),
    componentSource(shape, selector, className, stem),
  );
  tree.write(
    joinPathFragments(folder, `${stem}.html`),
    shape.html(fileName, baseClass),
  );
  tree.write(joinPathFragments(folder, `${stem}.scss`), '');

  if (options.withTest ?? true) {
    tree.write(
      joinPathFragments(folder, `${stem}.spec.ts`),
      specSource(className, stem),
    );
  }

  if (options.withStory) {
    if (hasStorybook(tree, config)) {
      tree.write(
        joinPathFragments(folder, `${fileName}.stories.ts`),
        storySource(className, baseName, stem),
      );
    } else {
      logger.warn(
        `Project "${options.project}" has no Storybook; skipped the story.`,
      );
    }
  }

  if (options.export) {
    const index = tree.read(indexPath, 'utf-8') ?? '';
    if (!index.split('\n').includes(exportLine)) {
      const separator = index === '' || index.endsWith('\n') ? '' : '\n';
      tree.write(indexPath, `${index}${separator}${exportLine}\n`);
    }
  }

  await formatFiles(tree);
}
