// bootstrap-table's dist files declare "type": "module" in package.json despite
// shipping legacy UMD code that relies on top-level `this` referring to the
// global object. Static ESM imports get `this === undefined` under esbuild's
// ESM interop, so the plugin never attaches itself to jQuery. Dynamic import
// after jQuery is set as the global mirrors the working jquery-treegrid
// workaround in treegrid-loader.ts and produces the `this === globalThis`
// binding these UMD bundles expect.
let bootstrapTableLoaded: Promise<void> | undefined;

export function loadBootstrapTable(): Promise<void> {
  bootstrapTableLoaded ??= (async () => {
    const { default: jQuery } = await import('jquery');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).jQuery = jQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).$ = jQuery;

    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/bootstrap-table.js');
    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/extensions/export/bootstrap-table-export.js');
    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/extensions/filter-control/bootstrap-table-filter-control.js');
    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/extensions/mobile/bootstrap-table-mobile.js');
    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/extensions/print/bootstrap-table-print.js');
    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/extensions/sticky-header/bootstrap-table-sticky-header.js');
    // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
    await import('bootstrap-table/dist/extensions/toolbar/bootstrap-table-toolbar.js');
  })();
  return bootstrapTableLoaded;
}
