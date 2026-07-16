// Sequential dynamic imports guarantee window.jQuery is set before treegrid's
// bare-global IIFE executes — static imports cannot provide this ordering due
// to Vite's needsInterop handling for legacy IIFE modules.
export async function loadTreegrid() {
  const { default: jQuery } = await import('jquery');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).jQuery = jQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).$ = jQuery;
  // @ts-expect-error — jquery-treegrid ships no type declarations
  await import('jquery-treegrid/js/jquery.treegrid.js');
}
