# Workspace

The projects, entry points and dependency direction of the ngkit monorepo.

## Projects

| Project | Type | Description |
| -- | -- | -- |
| `ng` | library | Core Angular utilities (`libs/ng`), published as `@rn-forge/ng` |
| `ng-bootstrap` | library | Bootstrap-based UI kit (`libs/ng-bootstrap`), published as `@rn-forge/ng-bootstrap`, depends on `ng` |
| `ng-tailwind` | library | Tailwind-friendly UI package (`libs/ng-tailwind`), published as `@rn-forge/ng-tailwind`: `--rnf-*` tokens and prebuilt component CSS, no Bootstrap |
| `ng-plugin` | library | Nx plugin (`tools/ng-plugin`), published as `@rn-forge/ng-plugin`: generators that set up Angular apps for the rn-forge libraries |
| `ng-demo` | app | Demo/dev app exercising both libraries (`apps/ng-demo`) |
| `ng-demo-e2e` | e2e app | Playwright tests for `ng-demo` (`apps/ng-demo-e2e`) |
| `ng-bootstrap-e2e` | e2e app | Playwright checks over applications built from the packed `ng-bootstrap` and `ng` tarballs (`apps/ng-bootstrap-e2e`) |
| `ng-tailwind-e2e` | e2e app | Playwright and axe-core checks over the built `ng-tailwind` Storybook (`apps/ng-tailwind-e2e`) |

Run `pnpm nx show project <name> --web` to see a project's full, resolved target
list.

## Entry points

Both packages are standalone components, signals and zoneless change detection.

| Package | Secondary entry points | What it gives you |
| -- | -- | -- |
| `@rn-forge/ng` | `/core`, `/auth`, `/crud` | No UI. Base component class, config/DI helpers, JWT auth (service + guards + interceptors + permission directives), and the resource screen's controller and data contract. No HTTP wrapper: use Angular `HttpClient`. |
| `@rn-forge/ng-bootstrap` | (root), `/shell`, `/form`, `/auth`, `/crud`, `/assets` | Bootstrap 5 UI: alert, button, error page, modal, data table (bootstrap-table + treegrid), app shell (header/footer/navbar/offcanvas/dark-mode), reactive-form fields, login/profile/settings screens, generic CRUD screen. |

## Source path map

```text
libs/ng/core/src/lib/          core.components|config|services|types|utils.ts  — BaseComponent, LocalStorageService, FormUtil, DateUtil, ObjectUtil
libs/ng/auth/src/lib/          auth.config|services|guards|interceptors|directives|types.ts
libs/ng-bootstrap/src/lib/     bootstrap.component.ts (ConfigurableComponent — read this one early), abstract-page.ts,
                               bootstrap.config.ts, alert/, button/, error/, modal/, table/
libs/ng-bootstrap/shell/src/   header/, footer/, navbar/, offcanvas/, color-mode/, shell.config.ts
libs/ng-bootstrap/form/src/    form/form.component.ts, form/fields/*/, form.config.ts
libs/ng-bootstrap/auth/src/    auth/, user/, abstract-auth-page.ts, auth-ui.config.ts
libs/ng/crud/src/              crud.types.ts, crud.list.ts, crud.errors.ts, crud.files.ts, crud.standard.ts
libs/ng-bootstrap/crud/src/    crud/crud.component.ts, crud/crud.manager.ts, crud.types.ts
libs/ng-bootstrap/assets/      theme.scss + README.md (styling setup, Sass @forward rationale)
apps/ng-demo/src/app/          ← THE reference implementation. Read this before writing anything.
```

## Dependency direction

`ng` has no UI; `ng-bootstrap` depends on `ng`, never the reverse; presentation
libraries only render. See [ADR-0002](../adr/ADR-0002.md).

## Nx targets worth knowing

- `pack` (`ng`, `ng-bootstrap`, `ng-tailwind`, `ng-plugin`): builds the library
  and writes an installable tarball under `dist/tarballs/`.
- `verify-consumer` (`ng`, `ng-tailwind`): kiln's `consumer` command installs
  the packed tarball into throwaway consumer projects, one per declared cell;
  see [Release pipeline](release-pipeline.md#consumer-verification).
- `consumer-fixture` (`ng-tailwind`): builds the `tailwind-22.1-zoneless` cell
  (`dist/consumer-fixtures/rn-forge-ng-tailwind-<version>/`) from the packed
  tarball, for the e2e cascade checks; see
  [Release pipeline](release-pipeline.md#consumer-verification).
- `compodoc` (`ng`, `ng-bootstrap`, `ng-tailwind`): generates the API reference
  published on the docs site.
- `build-storybook` (`ng-bootstrap`, `ng-tailwind`): builds the component
  catalog published on the docs site.
- `e2e` and `e2e-ci` (`ng-tailwind-e2e`): one Playwright web server builds
  `ng-tailwind:build-storybook` and serves `dist/storybook/ng-tailwind` with
  `apps/ng-tailwind-e2e/serve.mjs`; a second runs
  `ng-tailwind:consumer-fixture` and serves the fixture's `out/browser` on
  port 4403 (`ROOT`, `SPA`); Chromium only.
- `e2e` and `e2e-ci` (`ng-bootstrap-e2e`): two Playwright web servers run
  `ng-bootstrap:consumer-fixture:floor` (`22.0-zone`, port 4404) and
  `ng-bootstrap:consumer-fixture` (`22.1-zoneless`, port 4405) and serve each
  fixture's `out/browser` with `apps/ng-tailwind-e2e/serve.mjs`; Chromium
  only.
- `e2e-ci` (`ng-demo-e2e`): the atomized Playwright target Nx Cloud distributes;
  see [Release pipeline](release-pipeline.md#ci).
