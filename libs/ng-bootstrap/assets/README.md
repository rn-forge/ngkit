# @rn-forge/ng-bootstrap/assets

Secondary entry point of `@rn-forge/ng-bootstrap`. Provides the stylesheet and script bundles that wire Bootstrap, Bootstrap Table, Bootstrap Icons, Quill, and jQuery-Treegrid into a consuming application.

---

## What's in this entry point

```
assets/
├── theme.scss              ← stylesheet entry (Bootstrap @forward chain)
├── styles.scss             ← legacy alias (deprecated — use theme.scss)
└── src/
    ├── index.ts            ← script entry (side-effect imports)
    ├── vendor-scripts.ts   ← Bootstrap + Bootstrap Table extension imports
    ├── ng-bootstrap-scripts.ts  ← reserved for library-level script overrides
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

## Scripts

### `src/index.ts` — the script entry point

```ts
import './vendor-scripts';
import './ng-bootstrap-scripts';
```

Import order matters: `vendor-scripts` must load before any library code that reads `window.jQuery` or bootstrap-table's global registry.

### `src/vendor-scripts.ts`

Side-effect-only imports that register globals and extend `$.fn`:

| Import | Effect |
|---|---|
| `bootstrap/dist/js/bootstrap.bundle.js` | Registers Bootstrap components (`Tooltip`, `Modal`, etc.) on `window.bootstrap` |
| `bootstrap-table/dist/bootstrap-table.js` | Registers `$.fn.bootstrapTable` |
| `bootstrap-table-export` | Adds export toolbar button |
| `bootstrap-table-filter-control` | Adds per-column filter inputs |
| `bootstrap-table-mobile` | Responsive card layout on small screens |
| `bootstrap-table-print` | Print toolbar button |
| `bootstrap-table-sticky-header` | Sticky `<thead>` on scroll |
| `bootstrap-table-toolbar` | Custom toolbar slots |
| `bootstrap-table-treegrid` | Hierarchical row support (bridge to jQuery Treegrid) |

**Why `.ts` and not `.js`?**

ng-packagr compiles secondary entry points with TypeScript, then bundles declarations with rollup. Rollup resolves imports by following the `.d.ts` files emitted by TypeScript into `tmp-typings/`. TypeScript only emits `.d.ts` for files it actually compiles — i.e. `.ts` files. If these were `.js` files, rollup would fail to find them in `tmp-typings/` at build time. Keeping them as `.ts` (even though the content is pure side-effect imports) ensures the declaration chain stays intact.

### `src/ng-bootstrap-scripts.ts`

Reserved for future library-level script initialization. Currently empty (`export {}`). Kept separate so library patches can be added here without touching `vendor-scripts.ts`.

---

## Usage

### 1. Styles — minimal (no Bootstrap customization)

In `apps/<your-app>/src/styles.scss`:

```scss
@use '@rn-forge/ng-bootstrap/assets/theme';
```

### 2. Styles — with Bootstrap variable overrides

```scss
// styles.scss
@use '@rn-forge/ng-bootstrap/assets/theme' with (
  $primary: #6200ea,
  $secondary: #03dac6,
  $font-family-base: 'Inter', sans-serif,
);
```

Full variable reference: https://github.com/twbs/bootstrap/blob/main/scss/_variables.scss

> Only Bootstrap variables can be overridden this way. Vendor CSS (Bootstrap Table, Bootstrap Icons, Quill) is loaded as plain CSS and is not configurable via Sass variables.

### 3. Scripts — via `angular.json` / `project.json`

Add the script entry to your app's build target:

```json
{
  "styles": ["apps/<your-app>/src/styles.scss"],
  "scripts": ["node_modules/@rn-forge/ng-bootstrap/assets/src/index.js"]
}
```

> The `setup-assets` generator handles this automatically. Run it instead of editing `project.json` by hand.

---

## `sideEffects: true`

The root `package.json` sets `"sideEffects": true`. This is required. Without it, bundlers (esbuild, webpack) apply tree-shaking and silently drop imports that have no exported symbols — exactly what `vendor-scripts.ts` consists of. The flag tells the bundler to always include these modules regardless of whether their exports are referenced.
