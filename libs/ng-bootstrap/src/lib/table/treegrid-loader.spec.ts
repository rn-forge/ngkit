import type { loadTreegrid as LoadTreegrid } from './treegrid-loader';

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
vi.mock('jquery-treegrid/js/jquery.treegrid.js', () => ({}));
vi.mock(
  'bootstrap-table/dist/extensions/treegrid/bootstrap-table-treegrid.js',
  () => ({}),
);

// loadTreegrid() delegates to bootstrap-table-loader's module-level singleton.
// This suite runs with Vitest isolation off (Angular's unit-test builder
// default), so every spec file shares one module registry — importing
// treegrid-loader statically would let whichever spec file runs first "win"
// that singleton and starve the others. Reset the registry and re-import
// fresh in each test so this suite can't be poisoned by (or poison) sibling
// specs such as bootstrap-table-loader.spec.ts.
async function importLoadTreegrid(): Promise<typeof LoadTreegrid> {
  vi.resetModules();
  return (await import('./treegrid-loader')).loadTreegrid;
}

describe('loadTreegrid', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['jQuery'];
    delete (globalThis as Record<string, unknown>)['$'];
  });

  it('loads bootstrap-table before the treegrid extension modules', async () => {
    const loadTreegrid = await importLoadTreegrid();
    await expect(loadTreegrid()).resolves.toBeUndefined();

    // jQuery is only set as a global as a side effect of loadBootstrapTable(),
    // so its presence proves the sequencing happened before treegrid loaded.
    expect((globalThis as Record<string, unknown>)['jQuery']).toBe(jQueryMock);
  });
});
