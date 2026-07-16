import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RNF_PERMISSION } from '@rn-forge/ng/auth';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { BackendService } from '@rn-forge/ng/http/crud';
import { ReadModel, WriteModel } from '@rn-forge/ng/http/crud';
import { AlertComponent } from '@rn-forge/ng-bootstrap';
import { FormComponent } from '@rn-forge/ng-bootstrap/form';
import { ModalComponent } from '@rn-forge/ng-bootstrap';
import { TableComponent } from '@rn-forge/ng-bootstrap';
import { AbstractCRUDManager } from './crud.manager';
import { CRUDContext, CRUDOptions } from './crud.types';

interface TestWrite extends WriteModel {
  name?: string;
}
interface TestRead extends ReadModel {
  readonly name: string;
}

@Injectable()
class TestManager extends AbstractCRUDManager<TestWrite, TestRead> {
  override name = 'Widget';
  override permissionKey = 'demo.widgets';
  readonly mockService = {} as unknown as BackendService<TestWrite, TestRead>;
  override get domainService() {
    return this.mockService;
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
}

const APP_CONFIG_PROVIDER = {
  provide: RN_FORGE_APP_CONFIG_TOKEN,
  useValue: { appName: 'test-app' },
};

function makeContext(overrides: Partial<CRUDContext> = {}): CRUDContext {
  return {
    listTable: {
      getSelectedRow: vi.fn(),
      getSelectedRows: vi.fn().mockReturnValue([]),
      getSelectedRowsCount: vi.fn().mockReturnValue(0),
      addRow: vi.fn(),
      updateRow: vi.fn(),
      deleteRows: vi.fn(),
      refresh: vi.fn(),
    } as unknown as TableComponent,
    addUpdateForm: {
      reset: vi.fn(),
      update: vi.fn(),
      enable: vi.fn(),
      updateOptions: vi.fn(),
      rawValue: {},
    } as unknown as FormComponent,
    deleteModal: {
      open: vi.fn(),
      dismissAll: vi.fn(),
      updateOptions: vi.fn(),
    } as unknown as ModalComponent,
    uploadForm: { reset: vi.fn() } as unknown as FormComponent,
    downloadForm: { reset: vi.fn(), rawValue: {} } as unknown as FormComponent,
    alert: {
      hide: vi.fn(),
      start: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    } as unknown as AlertComponent,
    config: () =>
      ({
        list: {},
        addUpdate: {},
        delete: {},
        upload: {},
        download: {},
      }) as CRUDOptions,
    ...overrides,
  };
}

describe('AbstractCRUDManager (via TestManager)', () => {
  let manager: TestManager;

  describe('without RNF_PERMISSION override (uses AllowAnyPermission default)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          APP_CONFIG_PROVIDER,
          TestManager,
          // No RNF_PERMISSION override — defaults to AllowAnyPermission (all true)
        ],
      });
      manager = TestBed.inject(TestManager);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('creates the manager', () => {
      expect(manager).toBeTruthy();
    });

    it('pluralName defaults to name + s', () => {
      expect(manager.pluralName).toBe('Widgets');
    });

    it('currentMode signal starts as "list"', () => {
      expect(manager.currentMode()).toBe('list');
    });

    it('config returns a safe default before init() is called', () => {
      const config = (manager as unknown as { config: CRUDOptions }).config;
      expect(config).toMatchObject({
        list: {},
        addUpdate: {},
        delete: {},
        upload: {},
        download: {},
      });
    });

    it('checkPermission returns true when AllowAnyPermission is active', () => {
      expect(manager.enableList()).toBe(true);
      expect(manager.enableAdd()).toBe(true);
      expect(manager.enableDelete()).toBe(true);
    });

    it('checkPermission returns true when permissionKey is empty', () => {
      manager.permissionKey = '';
      expect(manager.enableList()).toBe(true);
    });

    it('enableAddUpdate is true when permissions are open', () => {
      expect(manager.enableAddUpdate()).toBe(true);
    });

    it('tableOptions() returns a valid options object before init()', () => {
      const opts = manager.tableOptions();
      expect(opts).toHaveProperty('columns');
      expect(opts).toHaveProperty('ajax');
      expect(opts).toHaveProperty('toolbarButtons');
    });

    it('addUpdateFormOptions() returns controls from addUpdateFormControls()', () => {
      const opts = manager.addUpdateFormOptions();
      expect(opts.controls).toEqual({ name: [''] });
    });

    it('sub-component getters throw descriptively before init()', () => {
      expect(
        () => (manager as unknown as { alert: AlertComponent }).alert,
      ).toThrow(
        'AbstractCRUDManager.init() must be called before any operation',
      );
    });

    it('init() stores context so sub-component getters stop throwing', () => {
      const ctx = makeContext();
      manager.init(ctx);
      expect(
        () => (manager as unknown as { alert: AlertComponent }).alert,
      ).not.toThrow();
    });

    it('config returns from context after init()', () => {
      const customConfig = {
        list: { pageSize: 25 },
        addUpdate: {},
        delete: {},
        upload: {},
        download: {},
      } as CRUDOptions;
      const ctx = makeContext({ config: () => customConfig });
      manager.init(ctx);
      const config = (manager as unknown as { config: CRUDOptions }).config;
      expect(config.list).toEqual({ pageSize: 25 });
    });

    it('updateCurrentMode() updates the signal', () => {
      const ctx = makeContext();
      manager.init(ctx);
      (
        manager as unknown as { updateCurrentMode(m: string): void }
      ).updateCurrentMode('addupdate');
      expect(manager.currentMode()).toBe('addupdate');
    });

    it('updateCurrentMode() calls alert.hide()', () => {
      const ctx = makeContext();
      manager.init(ctx);
      (
        manager as unknown as { updateCurrentMode(m: string): void }
      ).updateCurrentMode('list');
      expect(ctx.alert.hide).toHaveBeenCalled();
    });

    it('cancelAddUpdate() resets mode to "list"', () => {
      const ctx = makeContext();
      manager.init(ctx);
      manager.currentMode.set('addupdate');
      manager.cancelAddUpdate();
      expect(manager.currentMode()).toBe('list');
    });

    it('handleErrorResponse() calls alert.error() with formatted message', () => {
      const ctx = makeContext();
      manager.init(ctx);
      const err = {
        error: { message: 'fail', error: 'ERR' },
      } as unknown as import('@angular/common/http').HttpErrorResponse;
      manager.handleErrorResponse(err);
      expect(ctx.alert.error).toHaveBeenCalledWith('fail [ERR]');
    });

    it('handleErrorResponse() with custom message overrides response message', () => {
      const ctx = makeContext();
      manager.init(ctx);
      const err = {
        error: { message: 'fail', error: 'ERR' },
      } as unknown as import('@angular/common/http').HttpErrorResponse;
      manager.handleErrorResponse(err, 'Custom msg');
      expect(ctx.alert.error).toHaveBeenCalledWith('Custom msg [ERR]');
    });

    it('handleErrorResponse() throws before init()', () => {
      const err = {
        error: { message: 'fail', error: 'ERR' },
      } as unknown as import('@angular/common/http').HttpErrorResponse;
      expect(() => manager.handleErrorResponse(err)).toThrow(
        'AbstractCRUDManager.init() must be called before any operation',
      );
    });
  });

  describe('with RNF_PERMISSION (controlled permission checks)', () => {
    const mockPermission = { hasPermission: vi.fn() };

    beforeEach(() => {
      mockPermission.hasPermission.mockReset();
      TestBed.configureTestingModule({
        providers: [
          APP_CONFIG_PROVIDER,
          TestManager,
          { provide: RNF_PERMISSION, useValue: mockPermission },
        ],
      });
      manager = TestBed.inject(TestManager);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('enableList() calls hasPermission with "list" suffix', () => {
      mockPermission.hasPermission.mockReturnValue(true);
      expect(manager.enableList()).toBe(true);
      expect(mockPermission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.list',
      );
    });

    it('enableAdd() calls hasPermission with "create" suffix', () => {
      mockPermission.hasPermission.mockReturnValue(false);
      expect(manager.enableAdd()).toBe(false);
      expect(mockPermission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.create',
      );
    });

    it('enableUpdate() calls hasPermission with "update" suffix', () => {
      mockPermission.hasPermission.mockReturnValue(true);
      expect(manager.enableUpdate()).toBe(true);
      expect(mockPermission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.update',
      );
    });

    it('enableDelete() calls hasPermission with "delete" suffix', () => {
      mockPermission.hasPermission.mockReturnValue(false);
      expect(manager.enableDelete()).toBe(false);
      expect(mockPermission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.delete',
      );
    });

    it('enableUpload() calls hasPermission with "upload" suffix', () => {
      mockPermission.hasPermission.mockReturnValue(false);
      manager.enableUpload();
      expect(mockPermission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.upload',
      );
    });

    it('enableDownload() calls hasPermission with "download" suffix', () => {
      mockPermission.hasPermission.mockReturnValue(false);
      manager.enableDownload();
      expect(mockPermission.hasPermission).toHaveBeenCalledWith(
        'demo.widgets.download',
      );
    });

    it('enableAddUpdate() is true when enableAdd is true', () => {
      mockPermission.hasPermission.mockReturnValue(true);
      expect(manager.enableAddUpdate()).toBe(true);
    });

    it('enableAddUpdate() is false when both add and update are denied', () => {
      mockPermission.hasPermission.mockReturnValue(false);
      expect(manager.enableAddUpdate()).toBe(false);
    });

    it('toolbar includes Add and Delete but not Update when only those are permitted', () => {
      mockPermission.hasPermission.mockImplementation(
        (perm: string) => perm.endsWith('.create') || perm.endsWith('.delete'),
      );
      const opts = manager.tableOptions();
      const labels = (opts.toolbarButtons as { label?: string }[]).map(
        (b) => b.label,
      );
      expect(labels).toContain('Add');
      expect(labels).toContain('Delete');
      expect(labels).not.toContain('Update');
    });
  });
});
