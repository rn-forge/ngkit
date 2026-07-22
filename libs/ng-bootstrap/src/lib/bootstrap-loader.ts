// Bootstrap's JS bundle is loaded dynamically at app startup by
// provideRnForgeBootstrapConfig, alongside the other vendor scripts. Loading it
// here (instead of a scripts/polyfills entry in the app build config) keeps all
// bootstrapping in one place and registers the data-attribute API listeners
// (dropdown, offcanvas, etc.) plus window.bootstrap before first render.
let bootstrapLoaded: Promise<void> | undefined;

export function loadBootstrap(): Promise<void> {
  bootstrapLoaded ??= (async () => {
    // @ts-expect-error — bootstrap ships no type declarations for its dist bundle
    await import('bootstrap/dist/js/bootstrap.bundle.js');
  })();
  return bootstrapLoaded;
}
