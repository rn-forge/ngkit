# E7 — Theme controller

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** the owner schedules it. It depends on E1 (done) and E3 (done), which supplies `RNF_BROWSER_STORAGE`.

**Source:** former roadmap item E2.

A single headless service that owns the color mode of an application: the chosen mode as a signal, its persistence, and the attribute on the document element that CSS reads. It serves any presentation package, and it removes the coupling that makes `rnf-color-mode` pull in the auth UI.

[Back to the board](../../index.md)

## Design

One shared service and API, not both a `ThemeService` and a `ColorModeService`.

- **Home.** `@rn-forge/ng/core`, beside the other core services, as an `@Injectable({ providedIn: 'root' })` service.
- **Provider.** `provideRnForgeColorMode(config?: ColorModeConfig): EnvironmentProviders`, with `config` carrying `{ storageKey, attribute, modes }`.
- **State.** A signal holding the mode, one of `system`, `light` or `dark`, with `set` and `cycle`. The service may accept an `auto` spelling for `system` at its boundary if an app needs one.
- **Output.** An attribute on the document element. Class-based output is allowed only if a consumer requires it.
- **Defaults.** Neutral and documented. The app supplies its storage key.
- **Inputs.** Inject `DOCUMENT` and `RNF_BROWSER_STORAGE`. Tolerate an absent browser, blocked storage and invalid stored values.
- **Initialization.** Apply the persisted choice when the service is created.
- **System mode.** Choosing `system` removes the explicit attribute and the stored override, so CSS follows the OS.
- **No flash.** Provide a configurable pre-paint snippet that uses the same key and attribute as the provider, because Angular startup cannot prevent a theme flash.
- **Out of scope.** No app fonts, brand CSS or logos.

### Acceptance (when promoted to a feature)

- Initialization stamps the attribute.
- The service constructs under SSR.
- A blocked `remove` is tolerated, as well as blocked `get` and `set`.
- A stored `dark` value is applied before bootstrap.
- `system` follows the OS.
- An explicit `light` wins over a dark OS.
- Print output remains light.

### Prior art

A 2026-09 survey of an existing Angular Material application found a 20-line theme service that persists a mode in `localStorage` and toggles a class on the document element. It shaped these requirements, which apply to this design:

- **Config.** `storageKey`, `attribute` (default undefined), `darkClass` (default undefined) and `setColorScheme` (whether to also set the CSS `color-scheme` property, default true). Supporting both an attribute and a class is what lets one service drive Bootstrap (`data-bs-theme`) and a Material app (a `dark` class plus `color-scheme`). The surveyed design defaulted `storageKey` to `'colorMode'`; this design has the app supply it instead. Settle which when the epic is elaborated.
- **Signals.** `mode` (as chosen) and `resolved` (`light` or `dark`, with `system` resolved against `prefers-color-scheme`), plus `set` and `toggle`. `toggle` switches between light and dark and resolves `system` first. The surveyed design typed the mode as `'light' | 'dark' | 'auto'`, where `auto` is this design's `system`.
- **Persistence.** Through the existing browser-storage service, which is namespaced by application name, not raw `localStorage`.
- **OS tracking.** Follow `matchMedia('(prefers-color-scheme: dark)')` for `system`, registering the listener through `DestroyRef`.
- **Applying.** Set the attribute, the class and `color-scheme` in a single `effect()`.
- **Guards.** Every `document` or `window` access is guarded, so the service is inert outside a browser.
- **Tests.** Persistence round-trip; `system` follows a mocked `matchMedia`; attribute and class both applied; toggle from `system`; no `document` access when it is unavailable.

**Requirement: decouple `rnf-color-mode` from `UserSettingsService`.** `libs/ng-bootstrap/shell/src/lib/color-mode/color-mode.ts` injects `UserSettingsService` from `@rn-forge/ng-bootstrap/auth`, so an app without auth that only wants a dark-mode toggle pulls in the whole auth UI entry point. It must be rebuilt on the headless service, with the `UserSettingsService` sync kept as an optional injection (`inject(UserSettingsService, { optional: true })`). `StyleHelper.setColorMode` becomes a thin adapter over the service or is removed. The component's public API (the `mode` input and the `colorMode` config key) and its Storybook stories stay unchanged, and the existing `ng-bootstrap` color-mode tests stay green after the decoupling.

## Open questions

- Settle the service's name (one service, not a `ThemeService` and a `ColorModeService`).
- Whether to accept an `auto` spelling for `system` at the boundary.
