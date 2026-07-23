# ng-bootstrap

This library was generated with [Nx](https://nx.dev).

## Setup

Call `provideRnForgeBootstrapConfig(...)` in the app's `app.config.ts`. It registers an app initializer that dynamically loads all required vendor scripts (Bootstrap, bootstrap-table + extensions, jQuery, and treegrid when `table.treegrid` is enabled) — no `scripts`/`polyfills` entries are needed in the app's build config for this.

For styles, see [`assets/README.md`](./assets/README.md).

### `allowedCommonJsDependencies`

Several packages across `@rn-forge/ng` and `@rn-forge/ng-bootstrap` ship CommonJS/UMD, not ESM, so `@angular/build:application` will emit a CommonJS warning per dependency unless the consuming app lists them in its own `project.json`. This setting is per-app — it is not inherited from the libraries. Add whichever entries apply, to the app's build `options`:

```json
"allowedCommonJsDependencies": [
  "bootstrap/dist/js/bootstrap.bundle.js",
  "jquery",
  "jquery-treegrid",
  "quill-delta",
  "build-url-ts"
]
```

| Entry | Required when | Source |
| --- | --- | --- |
| `bootstrap/dist/js/bootstrap.bundle.js`, `jquery` | Always — loaded by `provideRnForgeBootstrapConfig` | `@rn-forge/ng-bootstrap` |
| `jquery-treegrid` | `table.treegrid` is enabled | `@rn-forge/ng-bootstrap` |
| `quill-delta` | App uses `@rn-forge/ng-bootstrap/form`'s rich-text field (`quill` itself is ESM; only its `quill-delta` dependency is CommonJS) | `@rn-forge/ng-bootstrap/form` |
| `build-url-ts` | App uses `@rn-forge/ng`'s `auth` sub-lib | `@rn-forge/ng` |

> This list will be added automatically by a scaffolding generator in a future version.
