import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import $ from 'jquery';
import { loadBootstrapTable } from './bootstrap-table-loader';
import { TableComponent, TableOptions, ToolbarHelper } from './table.component';

describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
    });
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "table"', () => {
    expect(component.configKey).toBe('table');
  });

  it('toolbarId is derived from the instance id', () => {
    expect(component.toolbarId()).toContain(component.instanceId);
  });
});

const updateSpy = vi.fn();
const deleteSpy = vi.fn();

@Component({
  standalone: true,
  imports: [TableComponent],
  template: '<rnf-table #t [options]="opts" />',
})
class HostComponent {
  readonly table = viewChild.required(TableComponent);
  opts: Partial<TableOptions> = {
    idField: 'id',
    pagination: false,
    search: false,
    columns: [
      { field: 'state', checkbox: true },
      { field: 'id', title: 'ID' },
      { field: 'name', title: 'Name' },
    ],
    toolbarButtons: [
      ToolbarHelper.updateButton(updateSpy),
      ToolbarHelper.deleteButton(deleteSpy),
    ],
  };
}

describe('TableComponent rendered host', () => {
  let fixture: ComponentFixture<HostComponent>;
  let table: TableComponent;
  // bootstrap-table mutates row objects (selection state): fresh rows per test
  let rows: { id: number; name: string }[];
  const makeRows = () => [
    { id: 1, name: 'one' },
    { id: 2, name: 'two' },
  ];

  const el = () => fixture.nativeElement as HTMLElement;
  const buttons = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('rnf-button button'));
  const rowChecks = () =>
    Array.from(
      el().querySelectorAll<HTMLInputElement>('tbody input[type=checkbox]'),
    );
  const click = (box: HTMLInputElement) => {
    box.click();
    fixture.detectChanges();
  };

  beforeAll(async () => {
    await loadBootstrapTable();
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    table = fixture.componentInstance.table();
    rows = makeRows();
    table.load(rows);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('renders a row per loaded item', () => {
    expect(table.rendered).toBe(true);
    expect(el().querySelectorAll('tbody tr').length).toBe(2);
    expect(table.getData()).toEqual(rows);
  });

  it('selecting a row updates the selection and the linked toolbar buttons', () => {
    expect(buttons().every((b) => b.disabled)).toBe(true);
    click(rowChecks()[0]);
    expect(table.getSelectedRows().length).toBe(1);
    expect(buttons().length).toBe(2);
    expect(buttons().every((b) => !b.disabled)).toBe(true);
    click(rowChecks()[0]);
    expect(table.getSelectedRows().length).toBe(0);
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('rerender keeps a single selection listener', () => {
    table.render();
    table.render();
    table.load(makeRows());
    fixture.detectChanges();
    const spy = vi.spyOn(table, 'getSelectedRowsCount');
    click(rowChecks()[0]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('rerender resets the selection state', () => {
    click(rowChecks()[0]);
    expect(buttons().every((b) => !b.disabled)).toBe(true);
    table.render();
    table.load(makeRows());
    fixture.detectChanges();
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('updateRow highlights the row and clears it after 5 s', async () => {
    table.updateRow({ id: 1, name: 'uno' });
    const row = () => el().querySelector('tbody tr[data-uniqueid="1"]');
    expect(row()?.classList.contains('highlight-update')).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(row()?.classList.contains('highlight-update')).toBe(false);
  });

  it('destroy() clears the plugin state', () => {
    click(rowChecks()[0]);
    table.destroy();
    expect(table.rendered).toBe(false);
    fixture.detectChanges();
    expect(el().querySelectorAll('rnf-button').length).toBe(0);
  });

  it('destroying the fixture after destroy() is safe', async () => {
    table.highlightRow(1);
    table.destroy();
    fixture.destroy();
    await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
  });

  const listenerCount = (t: JQuery) => {
    const events = ($ as any)._data(t[0], 'events') ?? {};
    let n = 0;
    for (const list of Object.values<any[]>(events))
      n += list.filter((h) => String(h.namespace).includes('ng-accel')).length;
    return n;
  };
  const highlighted = () =>
    Array.from(el().querySelectorAll('tbody tr.highlight-update')).map((tr) =>
      tr.getAttribute('data-uniqueid'),
    );
  const punctuatedIds = ["a'b", 'a b', 'a.b', 'a]b', 'a:b'];
  const loadIdRows = (extra: { id: string | number; name: string }[] = []) => {
    table.load([
      ...punctuatedIds.map((id) => ({ id, name: id })),
      { id: 'a', name: 'a' },
      { id: 1, name: 'one' },
      ...extra,
    ]);
    fixture.detectChanges();
  };

  it('fixture destruction releases the plugin, listeners and highlight timers', () => {
    click(rowChecks()[0]);
    table.highlightRow(1);
    const t = table.table;
    expect(listenerCount(t)).toBe(4);
    expect(vi.getTimerCount()).toBe(1);
    expect(t.data('bootstrap.table')).toBeDefined();
    fixture.destroy();
    expect(table.rendered).toBe(false);
    expect(listenerCount(t)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(t.data('bootstrap.table')).toBeUndefined();
  });

  it('destroy() cancels pending highlight timers', async () => {
    table.highlightRow(1);
    table.destroy();
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(0);
    await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
  });

  it('explicit destroy() then fixture destruction is safe', async () => {
    table.highlightRow(1);
    const t = table.table;
    table.destroy();
    fixture.detectChanges();
    expect(() => fixture.destroy()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
    expect(listenerCount(t)).toBe(0);
    await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
  });

  for (const id of punctuatedIds) {
    it(`highlights rows whose ids contain spaces, quotes or selector punctuation: ${id}`, async () => {
      loadIdRows();
      expect(() => table.highlightRow(id)).not.toThrow();
      expect(highlighted()).toEqual([id]);
      await vi.advanceTimersByTimeAsync(5000);
      expect(highlighted()).toEqual([]);
    });
  }

  it('highlight matches the whole id only', () => {
    loadIdRows();
    table.highlightRow('a');
    expect(highlighted()).toEqual(['a']);
    table.highlightRow(1);
    table.highlightRow('1');
    expect(highlighted().sort()).toEqual(['1', 'a']);
  });

  it('deleteRows with a punctuated id removes the row', () => {
    loadIdRows();
    table.deleteRows(["a'b"]);
    const ids = table.getData<{ id: string | number }>().map((r) => r.id);
    expect(ids).not.toContain("a'b");
    expect(ids).toEqual(expect.arrayContaining(['a b', 'a', 1]));
  });

  it('updateRow with a punctuated id updates the row and highlights it', async () => {
    loadIdRows();
    table.updateRow({ id: "a'b", name: 'changed' });
    const row = table
      .getData<{ id: string; name: string }>()
      .find((r) => r.id === "a'b");
    expect(row?.name).toBe('changed');
    expect(highlighted()).toEqual(["a'b"]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(highlighted()).toEqual([]);
  });
});
