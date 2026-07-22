# @rn-forge/ng-bootstrap/assets

Stylesheet entry point of `@rn-forge/ng-bootstrap`. Provides the Sass theme that wires Bootstrap, Bootstrap Table, Bootstrap Icons, Quill, and jQuery-Treegrid CSS into a consuming application.

> **Scripts are not loaded from here.** All vendor JavaScript (Bootstrap bundle, bootstrap-table + extensions, jQuery globals, treegrid) is loaded dynamically at app startup by `provideRnForgeBootstrapConfig()` — see `src/lib/bootstrap-loader.ts`, `src/lib/table/bootstrap-table-loader.ts`, and `src/lib/ng-bootstrap-scripts.ts` in the main entry point. Consuming apps need no `scripts`/`polyfills` entries in their build config.

---

## What's in this entry point

```text
assets/
├── theme.scss              ← stylesheet entry (Bootstrap @forward chain)
└── src/
    ├── vendor-styles.scss  ← vendor CSS (Bootstrap Icons, table extensions, Quill)
    └── ng-bootstrap-styles.scss ← library-level global style overrides
```

---

## Stylesheets

### Why `@forward` instead of `@use`

Sass's `@use ... with (...)` clause locks variable values the moment a module is loaded, and only the **first** `@use` in the entire load graph can configure a module. If the library used `@use 'bootstrap/scss/bootstrap'` internally, any consuming app that also tried `@use 'bootstrap/scss/bootstrap' with ($primary: ...)` would get a Sass error — the module is already configured and sealed.

`@forward` re-exports without loading, keeping the configuration slot open. The consumer performs the single `@use ... with (...)` that actually configures and loads Bootstrap.

### `theme.scss` — the entry point

```scss
@forward 'bootstrap/scss/bootstrap';
@forward 'src/vendor-styles';
@forward 'src/ng-bootstrap-styles';
```

`theme.scss` chains all three layers through `@forward`. The consuming app's `styles.scss` does the final `@use`, which loads and configures everything in one shot.

### `src/vendor-styles.scss`

Pulls in vendor CSS that Bootstrap's Sass pipeline doesn't cover:

- **Bootstrap Icons** — icon font via `@use`
- **Bootstrap Table extensions** — filter-control, fixed-columns, sticky-header, etc. via `meta.load-css` (plain CSS, not Sass)
- **jQuery Treegrid** — treegrid row-indent styles
- **Quill** — rich-text editor snow theme

### `src/ng-bootstrap-styles.scss`

Library-level global style overrides. These exist at this level because Bootstrap Table dynamically injects DOM that is outside Angular component view encapsulation, so component-scoped styles cannot reach it.

---

## Usage

### 1. Minimal (no Bootstrap customization)

In `apps/<your-app>/src/styles.scss`:

```scss
@use '@rn-forge/ng-bootstrap/assets/theme';
```

### 2. With Bootstrap variable overrides

```scss
// styles.scss
@use '@rn-forge/ng-bootstrap/assets/theme' with (
  $primary: #6200ea,
  $secondary: #03dac6,
  $font-family-base: 'Inter', sans-serif,
);
```

Full variable reference: <https://github.com/twbs/bootstrap/blob/main/scss/_variables.scss>

> Only Bootstrap variables can be overridden this way. Vendor CSS (Bootstrap Table, Bootstrap Icons, Quill) is loaded as plain CSS and is not configurable via Sass variables.
