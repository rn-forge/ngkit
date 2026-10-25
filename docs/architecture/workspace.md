# Workspace

The projects, entry points and dependency direction of the ngkit monorepo.

## Projects

| Project        | Type    | Description                                                                                                                                        |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ng`           | library | Core Angular utilities (`libs/ng`), published as `@rn-forge/ng`                                                                                    |
| `ng-bootstrap` | library | Bootstrap-based UI kit (`libs/ng-bootstrap`), published as `@rn-forge/ng-bootstrap`, depends on `ng`                                               |
| `ng-tailwind`  | library | Tailwind-friendly UI package (`libs/ng-tailwind`), published as `@rn-forge/ng-tailwind`: `--rnf-*` tokens and prebuilt component CSS, no Bootstrap |
| `ng-demo`      | app     | Demo/dev app exercising both libraries (`apps/ng-demo`)                                                                                            |
| `ng-demo-e2e`  | e2e app | Playwright tests for `ng-demo` (`apps/ng-demo-e2e`)                                                                                                |

Run `pnpm nx show project <name> --web` to see a project's full, resolved target list.

## Entry points

Both packages are standalone components, signals and zoneless change detection.

| Package                  | Secondary entry points                                 | What it gives you                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rn-forge/ng`           | `/core`, `/auth`, `/crud`                              | No UI. Base component class, config/DI helpers, JWT auth (service + guards + interceptors + permission directives), and the resource screen's controller and data contract. No HTTP wrapper: use Angular `HttpClient`.      |
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

`ng` has no UI; `ng-bootstrap` depends on `ng`, never the reverse; presentation libraries only render. See [ADR-0002](../adr/ADR-0002.md).

## Nx targets worth knowing

- `pack` (`ng`, `ng-bootstrap`, `ng-tailwind`): builds the library and writes an installable tarball under `dist/tarballs/`.
- `verify-consumer` (`ng`): installs the packed tarball into throwaway consumer projects; see [Release pipeline](release-pipeline.md#consumer-verification).
- `patch-package-exports` (`ng-bootstrap`, `ng-tailwind`): fixes the dist `package.json`'s `exports` map so asset imports resolve; see [Release pipeline](release-pipeline.md#patch-package-exports).
- `compodoc` (`ng`, `ng-bootstrap`, `ng-tailwind`): generates the API reference published on the docs site.
- `build-storybook` (`ng-bootstrap`, `ng-tailwind`): builds the component catalog published on the docs site.
- `e2e-ci` (`ng-demo-e2e`): the atomized Playwright target Nx Cloud distributes; see [Release pipeline](release-pipeline.md#ci).
