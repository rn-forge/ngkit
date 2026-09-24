import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReadModel, WriteModel } from '@rn-forge/ng/crud';
import { AbstractCrudManager } from './crud.manager';
import { CrudComponent } from './crud.component';
import { CrudContext } from './crud.types';

function makeMockManager() {
  const initSpy = vi.fn();
  return {
    currentMode: signal<'list' | 'addupdate' | 'import'>('list'),
    conflict: signal(false),
    importFile: signal(undefined),
    importOutcome: signal(undefined),
    enableList: () => false,
    enableAddUpdate: () => false,
    enableDelete: () => false,
    enableImport: () => false,
    enableImportTemplate: () => false,
    filterFields: () => [],
    hasList: () => false,
    pluralName: 'Tests',
    tableOptions: () => ({ columns: [] }),
    addUpdateFormOptions: () => ({ controls: {} }),
    deleteModalOptions: () => ({}),
    init: initSpy,
    _initSpy: initSpy,
  } as unknown as AbstractCrudManager<WriteModel, ReadModel> & {
    _initSpy: ReturnType<typeof vi.fn>;
  };
}

describe('CrudComponent', () => {
  let component: CrudComponent;
  let fixture: ComponentFixture<CrudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrudComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(CrudComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "crud"', () => {
    expect(component.configKey).toBe('crud');
  });

  it('defaultOptions() returns empty partials for all sections', () => {
    expect(component.defaultOptions()).toEqual({
      list: {},
      addUpdate: {},
      delete: {},
    });
  });

  it('ngAfterViewInit calls manager.init() with a CrudContext', () => {
    const mockManager = makeMockManager();
    fixture.componentRef.setInput('manager', mockManager);
    fixture.detectChanges();

    expect(mockManager._initSpy).toHaveBeenCalledOnce();
    const ctx: CrudContext = mockManager._initSpy.mock.calls[0][0];
    expect(typeof ctx.config).toBe('function');
    expect(ctx.config()).toMatchObject({ list: {}, addUpdate: {}, delete: {} });
  });
});
