#!/usr/bin/env node
/**
 * `kiln-devops consumer` hook for @rn-forge/ng-bootstrap. Run as
 * `node tools/consumer/ng-bootstrap-app.mjs <fixture-dir> <cell>` after kiln has
 * installed the packed tarball into the cell's fixture and smoke-tested the entry
 * points. Builds a real Angular application from the packed `ng-bootstrap` and `ng`
 * tarballs with `ng build` (AOT, strictTemplates, no tsconfig paths, so every import
 * resolves from node_modules), then asserts on the built CSS and JS. The application
 * renders a root section, a form and a CRUD table over an in-memory `/api/widgets`
 * interceptor; the Playwright project `ng-bootstrap-e2e` serves and drives it. The
 * change-detection mode comes from the cell name, `<angular>-<zone|zoneless>`; the
 * Angular, rxjs and vendor versions and the `file:` tarball for `@rn-forge/ng` come
 * from the `package.json` kiln wrote into the fixture.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [fixture, cell] = process.argv.slice(2);
const cellMatch = /^\d+\.\d+-(zone|zoneless)$/.exec(cell ?? '');
if (!fixture || !cellMatch) {
  console.error(
    'Usage: ng-bootstrap-app.mjs <fixture-dir> <angular>-<zone|zoneless>',
  );
  process.exit(2);
}
const changeDetectionMode = cellMatch[1];

const MAIN_TS = (
  changeDetectionMode,
) => `import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideZoneChangeDetection,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideRnForgeCoreConfig } from '@rn-forge/ng/core';
import { provideRnForgeBootstrapConfig } from '@rn-forge/ng-bootstrap';
import { provideRnForgeCrudConfig } from '@rn-forge/ng-bootstrap/crud';
import { provideRnForgeFormConfig } from '@rn-forge/ng-bootstrap/form';
import { provideRnForgeShellConfig } from '@rn-forge/ng-bootstrap/shell';
import { App } from './app';
import { fixtureApi } from './fixture-api';

bootstrapApplication(App, {
  providers: [
    ${
      changeDetectionMode === 'zone'
        ? 'provideZoneChangeDetection()'
        : 'provideZonelessChangeDetection()'
    },
    provideRouter([]),
    provideHttpClient(withInterceptors([fixtureApi])),
    provideRnForgeCoreConfig({ appName: 'rnf-consumer' }),
    provideRnForgeBootstrapConfig({ table: { treegrid: true } }),
    provideRnForgeFormConfig({}),
    provideRnForgeCrudConfig({}),
    provideRnForgeShellConfig({}),
  ],
});
`;

const FIXTURE_API_TS = `import {
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';

interface Widget {
  id: number;
  name: string;
}

let widgets: Widget[] = [
  { id: 1, name: 'Widget A' },
  { id: 2, name: 'Widget B' },
  { id: 3, name: 'Widget C' },
];
let nextId = 100;

const respond = (
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): Observable<HttpEvent<unknown>> =>
  of(new HttpResponse({ status, body, headers: new HttpHeaders(headers) }));

/** One in-memory \`/api/widgets\` collection: list, create and delete. */
export const fixtureApi: HttpInterceptorFn = (req, next) => {
  const path = req.url.split('?')[0];
  const base = /\\/api\\/widgets(.*)$/.exec(path)?.[1];
  if (base === undefined) return next(req);
  if (req.method === 'GET' && base === '') {
    return respond(200, { items: widgets, nextPageToken: null });
  }
  if (req.method === 'POST' && base === '') {
    const created = { ...(req.body as Omit<Widget, 'id'>), id: nextId++ };
    widgets = [...widgets, created];
    return respond(201, created, { ETag: '"v1"' });
  }
  const id = /^\\/(\\d+)$/.exec(base)?.[1];
  if (id !== undefined && req.method === 'DELETE') {
    widgets = widgets.filter((w) => w.id !== Number(id));
    return respond(204, null);
  }
  if (id !== undefined && req.method === 'GET') {
    const found = widgets.find((w) => w.id === Number(id));
    return respond(found ? 200 : 404, found ?? null, { ETag: '"v1"' });
  }
  return next(req);
};
`;

const MANAGER_TS = `import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { GenericType } from '@rn-forge/ng/core';
import {
  ReadModel,
  standardDataSource,
  WriteModel,
} from '@rn-forge/ng/crud';
import { ColumnOptions } from '@rn-forge/ng-bootstrap';
import { AbstractCrudManager } from '@rn-forge/ng-bootstrap/crud';

export interface WidgetWrite extends WriteModel {
  id?: number | null;
  name: string;
}

export interface WidgetRead extends ReadModel {
  readonly id: number;
  readonly name: string;
}

@Injectable()
export class WidgetsManager extends AbstractCrudManager<
  WidgetWrite,
  WidgetRead
> {
  override readonly name = 'Widget';
  override permissionKey = '';

  override readonly dataSource = standardDataSource<WidgetWrite, WidgetRead>({
    baseUrl: '/api',
    collection: '/widgets',
  });

  override tableColumns(): ColumnOptions[] {
    return [
      { field: 'state', title: 'State', checkbox: true },
      { field: 'id', title: 'ID', sortable: true },
      { field: 'name', title: 'Name', sortable: true },
    ];
  }

  override addUpdateFormControls(): GenericType {
    return { id: ['', []], name: ['', [Validators.required]] };
  }

  override toAddUpdateFormValue(data: WidgetRead): WidgetWrite {
    return { id: data.id, name: data.name };
  }

  override fromAddUpdateFormValue(): WidgetWrite {
    const raw = this.addUpdateForm.rawValue as GenericType;
    return { id: raw['id'] as number | undefined, name: raw['name'] as string };
  }
}
`;

const APP_TS = `import { JsonPipe } from '@angular/common';
import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import {
  AlertComponent,
  ButtonComponent,
} from '@rn-forge/ng-bootstrap';
import { CrudComponent } from '@rn-forge/ng-bootstrap/crud';
import { FormComponent, FormOptions, InputFieldComponent } from '@rn-forge/ng-bootstrap/form';
import { WidgetsManager } from './widgets.manager';

declare global {
  interface Window {
    __rnfFixture?: Record<string, boolean>;
  }
}

@Component({
  selector: 'app-root',
  imports: [
    AlertComponent,
    ButtonComponent,
    CrudComponent,
    FormComponent,
    InputFieldComponent,
    JsonPipe,
  ],
  providers: [WidgetsManager],
  templateUrl: './app.html',
})
export class App implements AfterViewInit {
  @ViewChild('alert') private readonly alert!: AlertComponent;

  protected readonly manager = inject(WidgetsManager);
  protected submitted?: unknown;
  protected readonly formOptions: Partial<FormOptions> = {
    controls: { title: ['', Validators.required] },
    submitBtn: 'Save',
  };

  constructor() {
    // Recorded at construction, which is after the app initializer: the plugins
    // must already be there when the first component is created. (The Bootstrap
    // bundle is proved by the dropdown's data-API listener, not window.bootstrap:
    // esbuild takes the UMD bundle's CommonJS branch and sets no global.)
    const w = window as unknown as Record<string, any>;
    window.__rnfFixture = {
      jQuery: !!w['jQuery'],
      bootstrapTable: typeof w['$']?.fn?.bootstrapTable === 'function',
      treegrid: typeof w['$']?.fn?.treegrid === 'function',
    };
  }

  ngAfterViewInit(): void {
    this.alert.success('Consumer fixture ready');
  }

  protected onSubmit(value: unknown): void {
    this.submitted = value;
  }
}
`;

const APP_HTML = `<div class="container py-3">
  <section data-test="root-section" class="mb-4">
    <rnf-alert #alert />
    <rnf-button label="Primary" class="primary" />
    <div class="dropdown d-inline-block ms-2">
      <button
        type="button"
        class="btn btn-secondary dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false">
        Menu
      </button>
      <ul class="dropdown-menu" data-test="dropdown-menu">
        <li><a class="dropdown-item" href="#">Action</a></li>
      </ul>
    </div>
    <i class="bi bi-check-circle ms-2"></i>
  </section>

  <section data-test="form-section" class="mb-4">
    <rnf-form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)" />
    <ng-template #fields let-ctx>
      <rnf-input-field name="title" label="Title" [formGroup]="ctx.formGroup" />
    </ng-template>
    @if (submitted) {
      <pre data-test="submitted">{{ submitted | json }}</pre>
    }
  </section>

  <section data-test="crud-section">
    <rnf-crud [manager]="manager" [addUpdateFormTemplate]="addUpdateTpl" />
    <ng-template #addUpdateTpl let-ctx>
      <rnf-input-field name="name" label="Name" [formGroup]="ctx.formGroup" />
    </ng-template>
  </section>
</div>
`;

function writeAngularApp(dir, changeDetectionMode) {
  const installed = JSON.parse(
    readFileSync(join(dir, 'package.json'), 'utf-8'),
  );
  const { dependencies } = installed;
  const angularVersion = dependencies['@angular/core'];
  const write = (file, content) => {
    mkdirSync(join(dir, file, '..'), { recursive: true });
    writeFileSync(
      join(dir, file),
      typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    );
  };
  // Keep kiln's dependencies (the packed tarballs and the cell's peers); add the build tools.
  write('package.json', {
    name: `rnf-consumer-fixture-${dir.split('/').pop()}`,
    private: true,
    type: 'module',
    dependencies,
    devDependencies: {
      '@angular/build': angularVersion,
      '@angular/cli': angularVersion,
      '@angular/compiler-cli': angularVersion,
      typescript: '~6.0.3',
    },
  });
  write('angular.json', {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    projects: {
      app: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: {
              browser: 'src/main.ts',
              tsConfig: 'tsconfig.app.json',
              styles: ['src/styles.scss'],
              polyfills:
                changeDetectionMode === 'zone'
                  ? ['@angular/localize/init', 'zone.js']
                  : ['@angular/localize/init'],
              outputPath: 'out',
              index: 'src/index.html',
            },
            configurations: {
              production: { outputHashing: 'none' },
            },
            defaultConfiguration: 'production',
          },
        },
      },
    },
  });
  // No \`paths\`: imports resolve only from node_modules, that is, from the tarballs.
  write('tsconfig.json', {
    compileOnSave: false,
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'preserve',
      moduleResolution: 'bundler',
      skipLibCheck: true,
      isolatedModules: true,
    },
    angularCompilerOptions: { strictTemplates: true },
  });
  write('tsconfig.app.json', {
    extends: './tsconfig.json',
    compilerOptions: { types: [] },
    files: ['src/main.ts'],
  });
  write(
    'src/index.html',
    '<!doctype html><html><head><meta charset="utf-8"><title>fixture</title><base href="/"></head><body><app-root></app-root></body></html>',
  );
  write('src/styles.scss', "@use '@rn-forge/ng-bootstrap/assets/theme';\n");
  write('src/main.ts', MAIN_TS(changeDetectionMode));
  write('src/fixture-api.ts', FIXTURE_API_TS);
  write('src/widgets.manager.ts', MANAGER_TS);
  write('src/app.ts', APP_TS);
  write('src/app.html', APP_HTML);
}

function readBuilt(dir, extension) {
  const outDir = join(dir, 'out', 'browser');
  return readdirSync(outDir)
    .filter((file) => file.endsWith(extension))
    .map((file) => readFileSync(join(outDir, file), 'utf-8'))
    .join('\n');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ok: ${message}`);
}

function assertBuild(dir) {
  const css = readBuilt(dir, '.css');
  const js = readBuilt(dir, '.js');
  assert(css.includes('.btn-primary'), 'CSS has .btn-primary (theme)');
  assert(css.includes('--bs-primary'), 'CSS has --bs-primary (theme)');
  assert(
    css.includes('.bootstrap-table'),
    'CSS has .bootstrap-table (vendor styles)',
  );
  assert(/\.bi-/.test(css), 'CSS has a .bi- rule (icon styles)');
  const jsFiles = readdirSync(join(dir, 'out', 'browser')).filter((f) =>
    f.endsWith('.js'),
  );
  assert(
    jsFiles.length > 1,
    `build has lazy chunks (${jsFiles.length} JS files)`,
  );
  assert(js.includes('bootstrapTable'), 'a JS file mentions bootstrapTable');
  assert(
    !/workspace:[\^*~\d]/.test(css + js),
    'no built file contains a workspace: range',
  );
}

writeAngularApp(fixture, changeDetectionMode);
execFileSync(
  'npm',
  ['install', '--no-audit', '--no-fund', '--loglevel=error'],
  { cwd: fixture, stdio: 'inherit' },
);
execFileSync('npx', ['ng', 'build'], { cwd: fixture, stdio: 'inherit' });
assertBuild(fixture);
