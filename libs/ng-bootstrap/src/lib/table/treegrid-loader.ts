import { loadBootstrapTable } from './bootstrap-table-loader';

// Sequential dynamic imports guarantee window.jQuery is set and bootstrap-table
// is registered before treegrid's bare-global IIFEs execute — static imports
// cannot provide this ordering due to Vite's needsInterop handling for legacy
// IIFE modules.
export async function loadTreegrid() {
  await loadBootstrapTable();
  // @ts-expect-error — jquery-treegrid ships no type declarations
  await import('jquery-treegrid/js/jquery.treegrid.js');
  // @ts-expect-error — bootstrap-table ships no type declarations for its dist files
  await import('bootstrap-table/dist/extensions/treegrid/bootstrap-table-treegrid.js');
}
