// Bootstrap's JS bundle is loaded dynamically at app startup by
// provideRnForgeBootstrapConfig, alongside the other vendor scripts. Loading it
// here (instead of a scripts/polyfills entry in the app build config) keeps all
// bootstrapping in one place: the bundle is imported once, before first render,
// and registers the Bootstrap data-attribute API listeners (dropdown,
// offcanvas, etc.) on `document`. window.bootstrap is not guaranteed (an
// installed consumer's bundler takes the UMD CommonJS branch), so code needing
// the JS API imports from 'bootstrap' instead of reading the global.
let bootstrapLoaded: Promise<void> | undefined;

export function loadBootstrap(): Promise<void> {
  bootstrapLoaded ??= (async () => {
    // @ts-expect-error — bootstrap ships no type declarations for its dist bundle
    await import('bootstrap/dist/js/bootstrap.bundle.js');
  })();
  return bootstrapLoaded;
}
