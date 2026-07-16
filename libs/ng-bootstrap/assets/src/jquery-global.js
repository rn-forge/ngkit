import jQuery from 'jquery';
// jQuery's CJS wrapper does not set window.jQuery when loaded as an ES module.
// Assign explicitly so UMD plugins (treegrid, bootstrap-table) can find the global.
globalThis.jQuery = jQuery;
globalThis.$ = jQuery;
window.jQuery = jQuery;
window.$ = jQuery;
