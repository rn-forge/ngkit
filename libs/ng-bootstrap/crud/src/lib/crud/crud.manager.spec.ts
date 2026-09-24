import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
import { RNF_PERMISSION } from '@rn-forge/ng/auth';
import { AppUtil, RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import {
  CrudDataSource,
  ImportReport,
  ReadModel,
  WriteModel,
} from '@rn-forge/ng/crud';
import { AlertComponent } from '@rn-forge/ng-bootstrap';
import { FormComponent } from '@rn-forge/ng-bootstrap/form';
import { ModalComponent } from '@rn-forge/ng-bootstrap';
import { TableComponent } from '@rn-forge/ng-bootstrap';
import { AbstractCrudManager } from './crud.manager';
import { CrudContext, CrudOptions } from './crud.types';

interface TestWrite extends WriteModel {
  name?: string;
}
interface TestRead extends ReadModel {
  readonly name: string;
}
type Source = CrudDataSource<TestWrite, TestRead>;

const rows: TestRead[] = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
];

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    list: vi.fn(() => of({ items: rows, nextPageToken: 'next' })),
    get: vi.fn((id: number) =>
      of({ value: { id, name: `n${id}` }, etag: `"e${id}"` }),
    ),
    create: vi.fn(() => of({ value: { id: 9, name: 'new' } })),
    update: vi.fn(() => of({ value: { id: 1, name: 'up' } })),
    delete: vi.fn(() => of(undefined)),
    ...overrides,
  };
}

@Injectable()
class TestManager extends AbstractCrudManager<TestWrite, TestRead> {
  override name = 'Widget';
  override permissionKey = 'demo.widgets';
  source: Source = makeSource();
  override get dataSource() {
    return this.source;
  }
  override tableColumns() {
    return [];
  }
  override addUpdateFormControls() {
    return { name: [''] };
  }
  override toAddUpdateFormValue(data: TestRead): TestWrite {
    return { id: data.id, name: data.name };
  }
  override fromAddUpdateFormValue(): TestWrite {
    return { name: 'typed' };
  }
  /** Exposes protected members to the tests. */
  call(method: string, ...args: unknown[]) {
    return (this as unknown as Record<string, (...a: unknown[]) => unknown>)[
      method
    ](...args);
  }
}

const APP_CONFIG_PROVIDER = {
  provide: RN_FORGE_APP_CONFIG_TOKEN,
  useValue: { appName: 'test-app' },
};

function makeContext(overrides: Partial<CrudContext> = {}) {
  const formGroup = new FormGroup({ name: new FormControl('') });
  const ctx = {
    listTable: {
      rendered: false,
      load: vi.fn(),
      bootstrapTable: vi.fn(),
      table: { on: vi.fn() },
      getSelectedRows: vi.fn().mockReturnValue([]),
    } as unknown as TableComponent,
    addUpdateForm: {
      reset: vi.fn(),
      update: vi.fn(),
      enable: vi.fn(),
      updateOptions: vi.fn(),
      rawValue: {},
      formGroup,
    } as unknown as FormComponent,
    deleteModal: {
      open: vi.fn(),
      dismissAll: vi.fn(),
      updateOptions: vi.fn(),
    } as unknown as ModalComponent,
    alert: {
      hide: vi.fn(),
      start: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    } as unknown as AlertComponent,
    config: () => ({ list: {}, addUpdate: {}, delete: {} }) as CrudOptions,
    ...overrides,
  };
  return { ctx: ctx as CrudContext, formGroup };
}

const http = (status: number, error?: unknown) =>
  new HttpErrorResponse({ status, error });

async function setup(permission?: { hasPermission: (k: string) => boolean }) {
  TestBed.configureTestingModule({
    providers: [
      APP_CONFIG_PROVIDER,
      TestManager,
      ...(permission
        ? [{ provide: RNF_PERMISSION, useValue: permission }]
        : []),
    ],
  });
  const manager = TestBed.inject(TestManager);
  const { ctx, formGroup } = makeContext();
  return { manager, ctx, formGroup };
}

async function settle() {
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
}

describe('AbstractCrudManager', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe('before init()', () => {
    it('has defaults and throws descriptively without a context', async () => {
      const { manager } = await setup();
      expect(manager.pluralName).toBe('Widgets');
      expect(manager.currentMode()).toBe('list');
      expect(manager.hasList()).toBe(false);
      expect(manager.filterFields()).toEqual([]);
      expect(() => manager.list).toThrow(/init\(\) must be called/);
      expect(() => manager.submitDelete()).toThrow(/init\(\) must be called/);
    });

    it('config falls back to empty sections', async () => {
      const { manager } = await setup();
      expect(
        (manager as unknown as { config: CrudOptions }).config,
      ).toMatchObject({ list: {}, addUpdate: {}, delete: {} });
    });

    it('addUpdateFormOptions() takes controls from the subclass', async () => {
      const { manager } = await setup();
      expect(manager.addUpdateFormOptions().controls).toEqual({ name: [''] });
    });
  });

  describe('permissions', () => {
    it('allows everything by default and with an empty key', async () => {
      const { manager } = await setup();
      expect(manager.enableList()).toBe(true);
      expect(manager.enableAddUpdate()).toBe(true);
      manager.permissionKey = '';
      expect(manager.enableDelete()).toBe(true);
    });

    it('asks RNF_PERMISSION for <key>.<suffix>', async () => {
      const permission = { hasPermission: vi.fn().mockReturnValue(false) };
      const { manager } = await setup(permission);
      expect(manager.enableList()).toBe(false);
      expect(permission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.list',
      );
      manager.enableAdd();
      expect(permission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.create',
      );
      manager.enableUpdate();
      manager.enableDelete();
      expect(permission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.update',
      );
      expect(permission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.delete',
      );
    });

    it('hides import and export unless the data source has them and permission allows', async () => {
      const permission = { hasPermission: vi.fn().mockReturnValue(true) };
      const { manager } = await setup(permission);
      expect(manager.enableImport()).toBe(false);
      expect(manager.enableExport()).toBe(false);
      expect(manager.enableImportTemplate()).toBe(false);

      manager.source = makeSource({
        import: vi.fn(),
        export: vi.fn(),
        importTemplate: vi.fn(),
      });
      expect(manager.enableImport()).toBe(true);
      expect(manager.enableExport()).toBe(true);
      expect(manager.enableImportTemplate()).toBe(true);
      expect(permission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.import',
      );
      expect(permission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.export',
      );

      permission.hasPermission.mockReturnValue(false);
      expect(manager.enableImport()).toBe(false);
    });
  });

  describe('list and table', () => {
    it('init() builds the list controller over the data source', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      expect(manager.hasList()).toBe(true);
      expect(manager.list.items()).toEqual(rows);
      expect(manager.source.list).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 10 }),
      );
    });

    it('tableOptions() is server-sided and writes orderBy on sort', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      const opts = manager.tableOptions();
      expect(opts).toMatchObject({
        sidePagination: 'server',
        pagination: false,
        search: false,
      });
      expect(opts).not.toHaveProperty('ajax');
      expect(manager.tableOptions()).toBe(opts);

      // bootstrap-table's typings say `number`; at runtime the order is a string.
      const onSort = opts.onSort as unknown as (f: string, o: string) => void;
      onSort('name', 'asc');
      expect(manager.list.orderBy()).toBe('name');
      onSort('name', 'desc');
      expect(manager.list.orderBy()).toBe('name desc');
    });

    it('toolbar shows only what the data source and permissions allow', async () => {
      const { manager } = await setup();
      const labels = (manager.tableOptions().toolbarButtons ?? []).map(
        (b) => b.label,
      );
      expect(labels).toEqual(['Add', 'Update', 'Delete']);
    });

    it('toolbar shows Import and Export when present', async () => {
      const { manager } = await setup();
      manager.source = makeSource({ import: vi.fn(), export: vi.fn() });
      const labels = (manager.tableOptions().toolbarButtons ?? []).map(
        (b) => b.label,
      );
      expect(labels).toEqual(['Add', 'Update', 'Delete', 'Import', 'Export']);
    });

    it('setFilterValue() sets and clears a filter, resetting the page', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.list.next();
      manager.setFilterValue('status', 'open');
      expect(manager.list.filter()).toEqual({ status: 'open' });
      expect(manager.list.pageIndex()).toBe(0);
      manager.setFilterValue('status', '');
      expect(manager.list.filter()).toEqual({ status: undefined });
    });

    it('loads rows into a rendered table and mirrors table selection back', async () => {
      const { manager } = await setup();
      const { ctx } = makeContext({
        listTable: {
          rendered: true,
          load: vi.fn(),
          bootstrapTable: vi.fn(),
          table: { on: vi.fn() },
          getSelectedRows: vi.fn().mockReturnValue([rows[1]]),
        } as unknown as TableComponent,
      });
      manager.init(ctx);
      await settle();
      expect(ctx.listTable.load).toHaveBeenCalledWith(rows);

      const on = (ctx.listTable.table.on as ReturnType<typeof vi.fn>).mock;
      expect(on.calls[0][0]).toContain('check.bs.table.crud');
      on.calls[0][1]();
      expect(manager.list.selection()).toEqual([2]);
    });

    it('shows a load error as an alert', async () => {
      const { manager, ctx } = await setup();
      manager.source = makeSource({
        list: () => throwError(() => http(500)),
      });
      manager.init(ctx);
      await settle();
      expect(ctx.alert.error).toHaveBeenCalled();
    });
  });

  describe('add and update', () => {
    it('startAdd() resets the form and switches mode', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      manager.call('startAdd');
      expect(ctx.addUpdateForm.updateOptions).toHaveBeenCalledWith({
        header: 'Add Widget',
      });
      expect(ctx.addUpdateForm.reset).toHaveBeenCalled();
      expect(manager.currentMode()).toBe('addupdate');
    });

    it('startUpdate() reads the row fresh and fills the form', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.list.select([1]);
      manager.call('startUpdate');
      expect(manager.source.get).toHaveBeenCalledWith(1);
      expect(ctx.addUpdateForm.update).toHaveBeenCalledWith({
        id: 1,
        name: 'n1',
      });
      expect(manager.currentMode()).toBe('addupdate');
    });

    it('startUpdate() does nothing without a selection and reports a failed read', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.call('startUpdate');
      expect(manager.source.get).not.toHaveBeenCalled();

      manager.source = makeSource({ get: () => throwError(() => http(404)) });
      manager.list.select([1]);
      manager.call('startUpdate');
      expect(ctx.alert.error).toHaveBeenCalled();
      expect(manager.currentMode()).toBe('list');
    });

    it('create sends an Idempotency-Key, reused on retry and renewed when the body changes', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      const create = vi.fn(() => throwError(() => http(500)));
      manager.source = makeSource({ create });
      manager.call('startAdd');

      manager.submitAddUpdate();
      manager.submitAddUpdate();
      const [first, retry] = create.mock.calls as unknown as [
        unknown,
        { idempotencyKey: string },
      ][];
      expect(first[1].idempotencyKey).toBeTruthy();
      expect(retry[1].idempotencyKey).toBe(first[1].idempotencyKey);

      manager.fromAddUpdateFormValue = () => ({ name: 'changed' });
      manager.submitAddUpdate();
      const changed = create.mock.calls[2] as unknown as [
        unknown,
        { idempotencyKey: string },
      ];
      expect(changed[1].idempotencyKey).not.toBe(first[1].idempotencyKey);
    });

    it('create success returns to the list, reloads and reports', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.call('startAdd');
      const listCalls = (manager.source.list as ReturnType<typeof vi.fn>).mock
        .calls.length;
      manager.submitAddUpdate();
      await settle();
      expect(ctx.alert.success).toHaveBeenCalledWith(
        'Added Widget successfully',
      );
      expect(manager.currentMode()).toBe('list');
      expect(
        (manager.source.list as ReturnType<typeof vi.fn>).mock.calls.length,
      ).toBeGreaterThan(listCalls);
    });

    it('update sends the etag it read', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.list.select([1]);
      manager.call('startUpdate');
      manager.submitAddUpdate();
      expect(manager.source.update).toHaveBeenCalledWith(
        1,
        { name: 'typed' },
        { etag: '"e1"' },
      );
      expect(ctx.alert.success).toHaveBeenCalledWith(
        'Updated Widget successfully',
      );
    });

    it('skips the request when validateAddUpdate() rejects', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      (
        manager as unknown as { validateAddUpdate: () => boolean }
      ).validateAddUpdate = () => false;
      manager.submitAddUpdate();
      expect(manager.source.create).not.toHaveBeenCalled();
      expect(ctx.addUpdateForm.enable).toHaveBeenCalled();
    });

    it('a 412 raises conflict and reloadConflict() keeps edits on the new etag', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.list.select([1]);
      manager.call('startUpdate');
      manager.source = makeSource({
        update: vi.fn(() =>
          throwError(() => http(412, { title: 'Precondition Failed' })),
        ),
        get: vi.fn(() =>
          of({ value: { id: 1, name: 'server' }, etag: '"e2"' }),
        ),
      });
      manager.submitAddUpdate();
      expect(manager.conflict()).toBe(true);
      expect(ctx.alert.error).toHaveBeenCalled();
      expect(ctx.addUpdateForm.enable).toHaveBeenCalled();

      manager.reloadConflict();
      expect(manager.conflict()).toBe(false);
      expect(ctx.alert.info).toHaveBeenCalled();
      expect(ctx.addUpdateForm.update).toHaveBeenCalledTimes(1); // edits kept

      manager.submitAddUpdate();
      expect(manager.source.update).toHaveBeenLastCalledWith(
        1,
        { name: 'typed' },
        { etag: '"e2"' },
      );
    });

    it('reloadConflict() reports a failed read and ignores no-edit state', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      manager.reloadConflict();
      expect(manager.source.get).not.toHaveBeenCalled();

      await settle();
      manager.list.select([1]);
      manager.call('startUpdate');
      manager.source = makeSource({ get: () => throwError(() => http(500)) });
      manager.reloadConflict();
      expect(ctx.alert.error).toHaveBeenCalled();
    });

    it('a 422 problem lands on the form controls', async () => {
      const { manager, ctx, formGroup } = await setup();
      manager.init(ctx);
      manager.source = makeSource({
        create: () =>
          throwError(() =>
            http(422, {
              title: 'Invalid',
              errors: [{ pointer: '/name', detail: 'taken' }],
            }),
          ),
      });
      manager.call('startAdd');
      manager.submitAddUpdate();
      expect(formGroup.get('name')?.errors).toEqual({ server: ['taken'] });
      expect(ctx.alert.error).toHaveBeenCalledWith('Invalid');
      expect(manager.conflict()).toBe(false);
    });

    it('other failures are alerts only', async () => {
      const { manager, ctx, formGroup } = await setup();
      manager.init(ctx);
      manager.source = makeSource({
        create: () => throwError(() => http(500)),
      });
      manager.call('startAdd');
      manager.submitAddUpdate();
      expect(ctx.alert.error).toHaveBeenCalled();
      expect(formGroup.get('name')?.errors).toBeNull();
    });

    it('cancelAddUpdate() clears conflict and returns to the list', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      manager.conflict.set(true);
      manager.call('startAdd');
      manager.cancelAddUpdate();
      expect(manager.conflict()).toBe(false);
      expect(manager.currentMode()).toBe('list');
    });

    it('toRequestParams() nulls empties and takes ids from objects', async () => {
      const { manager } = await setup();
      expect(
        manager.call('toRequestParams', { a: '', b: { id: 3 }, c: 'x' }),
      ).toEqual({ a: null, b: 3, c: 'x' });
    });
  });

  describe('delete', () => {
    it('startDelete() opens the modal with the selection count', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.list.select([1, 2]);
      manager.call('startDelete');
      expect(ctx.deleteModal.updateOptions).toHaveBeenCalledWith({
        context: { name: 'Widget', count: 2 },
      });
      expect(ctx.deleteModal.open).toHaveBeenCalled();
      expect(manager.deleteModalOptions()).toMatchObject({
        submitBtn: { label: 'Delete' },
      });
    });

    it('uses batchDelete when present', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      const batchDelete = vi.fn(() => of(undefined));
      manager.source = makeSource({ batchDelete });
      manager.list.select([1, 2]);
      manager.submitDelete();
      expect(batchDelete).toHaveBeenCalledWith([1, 2]);
      expect(manager.source.delete).not.toHaveBeenCalled();
      expect(ctx.alert.success).toHaveBeenCalledWith(
        'Deleted 2 Widgets successfully',
      );
      expect(manager.list.selection()).toEqual([]);
    });

    it('falls back to one delete per id', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.list.select([1]);
      manager.submitDelete();
      expect(manager.source.delete).toHaveBeenCalledWith(1);
      expect(ctx.alert.success).toHaveBeenCalledWith(
        'Deleted 1 Widget successfully',
      );
    });

    it('reports a failed delete', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      await settle();
      manager.source = makeSource({
        delete: () => throwError(() => http(404)),
      });
      manager.list.select([1]);
      manager.submitDelete();
      expect(ctx.alert.error).toHaveBeenCalled();
    });
  });

  describe('import and export', () => {
    const file = new File(['a'], 'rows.csv');
    const report = (over: Partial<ImportReport> = {}): ImportReport => ({
      created: 2,
      updated: 1,
      skipped: 0,
      validateOnly: true,
      ...over,
    });

    async function withImport(importFn: Source['import']) {
      const ctxs = await setup();
      ctxs.manager.source = makeSource({ import: importFn });
      ctxs.manager.init(ctxs.ctx);
      await settle();
      return ctxs;
    }

    it('does nothing without a file or an import method', async () => {
      const { manager } = await setup();
      manager.init(makeContext().ctx);
      manager.validateImport();
      const importFn = vi.fn(() => of(report()));
      manager.source = makeSource({ import: importFn });
      manager.validateImport();
      expect(importFn).not.toHaveBeenCalled();
    });

    it('validate then commit: two steps, commit only after a clean validate', async () => {
      const importFn = vi.fn((_f: File, o: { validateOnly: boolean }) =>
        of(report({ validateOnly: o.validateOnly })),
      );
      const { manager, ctx } = await withImport(importFn);
      manager.call('startImport');
      expect(manager.currentMode()).toBe('import');
      manager.setImportFile(file);

      manager.validateImport();
      expect(importFn).toHaveBeenLastCalledWith(file, { validateOnly: true });
      expect(manager.importOutcome()).toMatchObject({
        canCommit: true,
        errors: [],
      });

      manager.commitImport();
      expect(importFn).toHaveBeenLastCalledWith(file, { validateOnly: false });
      expect(ctx.alert.success).toHaveBeenCalled();
      expect(manager.currentMode()).toBe('list');
    });

    it('a 422 shows the row errors and blocks commit', async () => {
      const { manager, ctx } = await withImport(() =>
        throwError(() =>
          http(422, {
            errors: [{ pointer: '/rows/12/Quantity', detail: 'not a number' }],
          }),
        ),
      );
      manager.setImportFile(file);
      manager.validateImport();
      expect(manager.importOutcome()).toEqual({
        errors: ['/rows/12/Quantity: not a number'],
        canCommit: false,
      });
      expect(ctx.alert.error).not.toHaveBeenCalled();
    });

    it('a failure without row errors is an alert', async () => {
      const { manager, ctx } = await withImport(() =>
        throwError(() => http(500)),
      );
      manager.setImportFile(file);
      manager.commitImport();
      expect(ctx.alert.error).toHaveBeenCalled();
    });

    it('a 200 listing errors is the partial-save variant: warns and stays', async () => {
      const { manager, ctx } = await withImport(() =>
        of(
          report({
            validateOnly: false,
            errors: [{ pointer: '/rows/3', detail: 'bad row' }],
          }),
        ),
      );
      manager.call('startImport');
      manager.setImportFile(file);
      manager.commitImport();
      expect(ctx.alert.warning).toHaveBeenCalledWith(
        expect.stringContaining('1 row(s) failed'),
      );
      expect(manager.currentMode()).toBe('import');
      expect(manager.importOutcome()?.errors).toEqual(['/rows/3: bad row']);
    });

    it('a validate pass that lists errors cannot be committed', async () => {
      const { manager } = await withImport(() =>
        of(report({ errors: [{ detail: 'row 1 bad' }] })),
      );
      manager.setImportFile(file);
      manager.validateImport();
      expect(manager.importOutcome()).toMatchObject({
        canCommit: false,
        errors: ['row 1 bad'],
      });
    });

    it('choosing a new file clears the last outcome; cancel returns to the list', async () => {
      const { manager } = await setup();
      manager.init(makeContext().ctx);
      manager.importOutcome.set({ errors: [], canCommit: true });
      manager.setImportFile(file);
      expect(manager.importOutcome()).toBeUndefined();
      manager.call('startImport');
      manager.cancelImport();
      expect(manager.currentMode()).toBe('list');
    });

    it('downloads the template and export through saveBlob', async () => {
      const save = vi
        .spyOn(AppUtil, 'saveBlob')
        .mockImplementation(() => undefined);
      const blob = new Blob(['x']);
      const importTemplate = vi.fn(
        (): Observable<{ blob: Blob; fileName: string }> =>
          of({ blob, fileName: 't.csv' }),
      );
      const exportFn = vi.fn(() => of({ blob, fileName: 'e.csv' }));
      const { manager } = await setup();
      manager.source = makeSource({ importTemplate, export: exportFn });
      manager.init(makeContext().ctx);
      await settle();
      manager.setFilterValue('status', 'open');

      manager.downloadTemplate(true);
      expect(importTemplate).toHaveBeenCalledWith(
        { status: 'open' },
        { prefill: true },
      );
      expect(save).toHaveBeenCalledWith(blob, 't.csv');

      manager.submitExport();
      expect(exportFn).toHaveBeenCalledWith('text/csv', { status: 'open' });
      expect(save).toHaveBeenCalledWith(blob, 'e.csv');
      save.mockRestore();
    });

    it('reports failed template and export downloads', async () => {
      const { manager, ctx } = await setup();
      manager.source = makeSource({
        importTemplate: () => throwError(() => http(500)),
        export: () => throwError(() => http(500)),
      });
      manager.init(ctx);
      await settle();
      manager.downloadTemplate(false);
      manager.submitExport();
      expect(ctx.alert.error).toHaveBeenCalledTimes(2);
    });

    it('template and export are no-ops when absent', async () => {
      const { manager, ctx } = await setup();
      manager.init(ctx);
      manager.downloadTemplate(false);
      manager.submitExport();
      expect(ctx.alert.error).not.toHaveBeenCalled();
    });
  });

  describe('error messages', () => {
    it('prefers a problem detail, then title, then the response message', async () => {
      const { manager } = await setup();
      const msg = (e: unknown) => manager.call('errorMessage', e);
      expect(msg(http(422, { detail: 'd', title: 't' }))).toBe('d');
      expect(msg(http(422, { title: 't' }))).toBe('t');
      expect(msg(http(500, 'x'))).toContain('Http failure response');
      expect(msg(new Error('plain'))).toBe('plain');
      expect(msg('str')).toBe('str');
    });
  });
});
