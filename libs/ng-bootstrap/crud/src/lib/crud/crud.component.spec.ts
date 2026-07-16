import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReadModel, WriteModel } from '@rn-forge/ng/http/crud';
import { AbstractCRUDManager } from './crud.manager';
import { CRUDComponent } from './crud.component';
import { CRUDContext } from './crud.types';

function makeMockManager() {
  const initSpy = vi.fn();
  return {
    currentMode: signal<'list' | 'addupdate' | 'upload' | 'download'>('list'),
    enableList: () => false,
    enableAddUpdate: () => false,
    enableDelete: () => false,
    enableUpload: () => false,
    enableDownload: () => false,
    pluralName: 'Tests',
    tableOptions: () => ({ columns: [] }),
    addUpdateFormOptions: () => ({ controls: {} }),
    deleteModalOptions: () => ({}),
    uploadFormOptions: () => ({ controls: {} }),
    downloadFormOptions: () => ({ controls: {} }),
    init: initSpy,
    _initSpy: initSpy,
  } as unknown as AbstractCRUDManager<WriteModel, ReadModel> & {
    _initSpy: ReturnType<typeof vi.fn>;
  };
}

describe('CRUDComponent', () => {
  let component: CRUDComponent;
  let fixture: ComponentFixture<CRUDComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CRUDComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(CRUDComponent);
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
    const defaults = component.defaultOptions();
    expect(defaults).toEqual({
      list: {},
      addUpdate: {},
      delete: {},
      upload: {},
      download: {},
    });
  });

  it('ngAfterViewInit calls manager.init() with a CRUDContext', () => {
    const mockManager = makeMockManager();
    fixture.componentRef.setInput('manager', mockManager);
    fixture.detectChanges();

    expect(
      (mockManager as unknown as { _initSpy: ReturnType<typeof vi.fn> })
        ._initSpy,
    ).toHaveBeenCalledOnce();
    const ctx: CRUDContext = (
      mockManager as unknown as { _initSpy: ReturnType<typeof vi.fn> }
    )._initSpy.mock.calls[0][0];
    expect(ctx).toBeDefined();
    expect(typeof ctx.config).toBe('function');
    expect(ctx.config()).toMatchObject({
      list: {},
      addUpdate: {},
      delete: {},
      upload: {},
      download: {},
    });
  });
});
