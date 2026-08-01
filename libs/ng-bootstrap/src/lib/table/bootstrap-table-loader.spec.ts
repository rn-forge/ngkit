import type { loadBootstrapTable as LoadBootstrapTable } from './bootstrap-table-loader';

const jQueryMock = { fn: {} };

vi.mock('jquery', () => ({ default: jQueryMock }));
vi.mock('bootstrap-table/dist/bootstrap-table.js', () => ({}));
vi.mock(
  'bootstrap-table/dist/extensions/export/bootstrap-table-export.js',
  () => ({}),
);
vi.mock(
  'bootstrap-table/dist/extensions/filter-control/bootstrap-table-filter-control.js',
  () => ({}),
);
vi.mock(
  'bootstrap-table/dist/extensions/mobile/bootstrap-table-mobile.js',
  () => ({}),
);
vi.mock(
  'bootstrap-table/dist/extensions/print/bootstrap-table-print.js',
  () => ({}),
);
vi.mock(
  'bootstrap-table/dist/extensions/sticky-header/bootstrap-table-sticky-header.js',
  () => ({}),
);
vi.mock(
  'bootstrap-table/dist/extensions/toolbar/bootstrap-table-toolbar.js',
  () => ({}),
);

// bootstrap-table-loader.ts memoizes its work in a module-level singleton.
// This suite runs with Vitest isolation off (Angular's unit-test builder
// default), so every spec file shares one module registry — importing the
// loader statically would let whichever spec file runs first "win" the
// singleton and starve the others. Reset the registry and re-import fresh
// in each test so this suite can't be poisoned by (or poison) sibling specs
// such as treegrid-loader.spec.ts, which exercises the same singleton.
async function importLoadBootstrapTable(): Promise<typeof LoadBootstrapTable> {
  vi.resetModules();
  return (await import('./bootstrap-table-loader')).loadBootstrapTable;
}

describe('loadBootstrapTable', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['jQuery'];
    delete (globalThis as Record<string, unknown>)['$'];
  });

  it('exposes jQuery as a global before loading the bootstrap-table bundles', async () => {
    const loadBootstrapTable = await importLoadBootstrapTable();
    await loadBootstrapTable();

    expect((globalThis as Record<string, unknown>)['jQuery']).toBe(jQueryMock);
    expect((globalThis as Record<string, unknown>)['$']).toBe(jQueryMock);
  });

  it('memoizes the load so repeated calls return the same promise', async () => {
    const loadBootstrapTable = await importLoadBootstrapTable();
    const first = loadBootstrapTable();
    const second = loadBootstrapTable();

    expect(second).toBe(first);
  });
});
