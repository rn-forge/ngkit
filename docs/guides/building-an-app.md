# ngkit — Agent Guide for Building Apps on `@rn-forge/ng` + `@rn-forge/ng-bootstrap`

**Purpose:** brief an AI coding agent building a _new, separate_ Angular webapp so it uses ngkit's components and conventions instead of hand-rolling vanilla Angular/Bootstrap/HTML. Written to be pasted into that agent's context.

**How to use it:**

1. **Design phase** — supply this document before the agent writes an implementation plan. §7 says what to decide; §3–6 say what primitives exist, so the plan is built _against_ ngkit's model (pages as `AbstractPage` subclasses, CRUD screens as manager+service quartets, forms as control-map + template) rather than retrofitted afterward.
2. **Build phase** — keep it attached alongside the plan, as the conventions reference. For exact API signatures the agent should use the lookup chain in §0, not this document.

One file serves both phases: it is structured decisions-first, patterns-second, and deliberately does _not_ try to be an API reference.

---

## 0. Where to look things up — read this first

This document is the **intent** layer: what to use, what to prefer, how pieces wire together. It is deliberately thin on exact signatures, because those change and this file would rot. Use this lookup chain, in order:

| Need                                                               | Go to                                                                                                                       |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Which component/service to use, and how they compose               | **This document**                                                                                                           |
| Live component examples, props, rendered states                    | **Storybook** — <https://rn-forge.github.io/ngkit/storybook/>                                                               |
| Exact inputs/outputs/methods/types for any class                   | **Compodoc API docs** — <https://rn-forge.github.io/ngkit/api/ng/> and <https://rn-forge.github.io/ngkit/api/ng-bootstrap/> |
| Ground truth — behaviour not documented, or docs look inconsistent | **The source**, see the path map below                                                                                      |

**Instruction to the implementing agent:** when this document is insufficient, ambiguous, or appears to contradict what you observe at build time (a type error, an unknown input, a missing export), **go read the library source rather than guessing or inventing an API.** The source is authoritative; this document is a summary that may lag it. Prefer reading a component's `.ts` + `.types.ts` pair over inferring from its name.

### Source path map

If the ngkit repo is available locally or cloned (`github.com/rn-forge/ngkit`):

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

**`apps/ng-demo/` is the single most valuable artifact in the repo for this task.** It exercises every library feature end-to-end: `products/` is the canonical CRUD quartet, `forms/` every field type, `org-chart/` tree-grid tables, `app.ts`/`app.html`/`app.config.ts`/`app.routes.ts` the full shell + provider + routing wiring. When in doubt about a pattern, copy from there rather than from this document's abbreviated snippets.

Each secondary entry point also has its own `README.md` (e.g. `libs/ng-bootstrap/assets/README.md` explains the Sass setup in detail).

---

## 1. What ngkit is

An Nx monorepo publishing two Angular libraries — standalone components, signals, zoneless change detection:

| Package                  | Secondary entry points                                 | What it gives you                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rn-forge/ng`           | `/core`, `/auth`, `/crud`                              | No UI. Base component class, config/DI helpers, JWT auth (service + guards + interceptors + permission directives). No HTTP wrapper — use Angular `HttpClient` (§5.3).                                                      |
| `@rn-forge/ng-bootstrap` | (root), `/shell`, `/form`, `/auth`, `/crud`, `/assets` | Bootstrap 5 UI: alert, button, error page, modal, data table (bootstrap-table + treegrid), app shell (header/footer/navbar/offcanvas/dark-mode), reactive-form fields, login/profile/settings screens, generic CRUD screen. |

`ng-bootstrap` depends on `ng`. Both are pre-1.0 and fixed/grouped-versioned together — they always release as a matched pair, so never mix versions between them.

**Golden rule:** if ngkit provides a component for something — data table, form field, page shell, CRUD screen, alert, modal, dark-mode toggle, permission-gated nav — use it. Do not write a raw `<table>`, a raw `<form>` with hand-wired `FormGroup` bypassing `rnf-form`, a custom modal, or a custom auth guard. These exist and are already wired into the config and theming system; a hand-rolled equivalent silently opts out of both. Reach for plain Angular/HTML only for things genuinely outside ngkit's scope (a bespoke chart, a one-off widget with no table/form/CRUD shape).

---

## 2. Installing it in a new app

**npm publishing is currently disabled** (dry-run only). The intended channel is tarballs attached to GitHub Releases, including a rolling `latest` — see `.github/workflows/release.yml`.

**Check what actually exists before writing a manifest** — do not fabricate a version or URL:

```sh
gh release list --repo rn-forge/ngkit
gh release view <tag> --repo rn-forge/ngkit    # exact asset filenames
```

**If a Release exists**, reference its assets:

```jsonc
"dependencies": {
  "@rn-forge/ng": "https://github.com/rn-forge/ngkit/releases/download/<tag>/rn-forge-ng-<version>.tgz",
  "@rn-forge/ng-bootstrap": "https://github.com/rn-forge/ngkit/releases/download/<tag>/rn-forge-ng-bootstrap-<version>.tgz"
}
```

**If none exists** (or you want a pinned local copy), build the tarballs from a clone of the ngkit repo and vendor them:

```sh
pnpm install
pnpm nx run-many -t pack --projects=ng,ng-bootstrap
# → dist/tarballs/rn-forge-ng-<version>.tgz, rn-forge-ng-bootstrap-<version>.tgz
```

```jsonc
"dependencies": {
  "@rn-forge/ng": "file:vendor/rn-forge-ng-<version>.tgz",
  "@rn-forge/ng-bootstrap": "file:vendor/rn-forge-ng-bootstrap-<version>.tgz"
}
```

**Peer dependencies are not auto-installed** — the consuming app must install them directly: `@angular/cdk`, `@angular/localize`, `@ng-bootstrap/ng-bootstrap`, `bootstrap`, `bootstrap-icons`, `bootstrap-table`, `jquery`, `jquery-treegrid`, `lodash-es`, `ngx-quill`, `quill`, `uuid` for `@rn-forge/ng-bootstrap`, and `@angular/common`/`core`/`forms`/`router` plus `rxjs` for both. Since 0.1.2, `@rn-forge/ng`'s own `build-url-ts`, `jwt-decode` and `lodash-es` are regular `dependencies` and install automatically. **Read the exact ranges from the packages' own `package.json#peerDependencies`** (in the tarball, or `libs/*/package.json` in the repo) — don't copy versions from memory or from this document. The Angular major must match ngkit's peer range.

---

## 3. Bootstrapping a new app

Mirror `apps/ng-demo/src/` — read `app.config.ts`, `app.routes.ts`, `app.ts`, `app.html`, and `styles.scss` there. Abbreviated below.

### 3.1 `styles.scss`

```scss
@use '@rn-forge/ng-bootstrap/assets/theme';
// to customize Bootstrap variables:
// @use '@rn-forge/ng-bootstrap/assets/theme' with (
//   $primary: #6200ea, $font-family-base: 'Inter', sans-serif,
// );
```

That one line pulls in Bootstrap core, Bootstrap Icons, bootstrap-table extension CSS, Quill's theme, jQuery-Treegrid CSS, and ngkit's overrides. Only Bootstrap's own Sass variables are overridable via `with (...)`. **Do not** separately `@use 'bootstrap/scss/bootstrap'` — it's already forwarded, and a second `@use ... with` is a Sass error. See `libs/ng-bootstrap/assets/README.md` for why `@forward` is used.

No `scripts`/`polyfills` build-config entries are needed — all vendor JS (Bootstrap bundle, jQuery, bootstrap-table, treegrid) is loaded by an app initializer inside `provideRnForgeBootstrapConfig()`.

### 3.2 `app.config.ts` — provider wiring

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(), // ngkit's demo runs zoneless — prefer for new apps
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authHttpInterceptor()])), // your interceptors alongside

    provideRnForgeCoreConfig({ appName: 'my-app' }), // namespaces localStorage; required broadly
    provideRnForgeAuthConfig({ backend: { baseUrl: environment.apiUrl } /* + frontend; omit for a no-auth app */ }), // backend.baseUrl required if AuthComponent is rendered
    { provide: API_URL, useValue: environment.apiUrl }, // app-owned token, one per backend (§5.3)
    provideRnForgeBootstrapConfig({ table: { minWidth: 700 } }), // required if using ANY ng-bootstrap component
    provideRnForgeShellConfig({}), // required (even empty) if using header/footer/navbar/color-mode

    { provide: ErrorHandler, useClass: AppErrorHandler }, // e.g. navigate to /error
  ],
};
```

Optionally `provideRnForgeAuthUiConfig`, `provideRnForgeCrudConfig`, `provideRnForgeFormConfig` — only if setting app-wide defaults for those areas.

**Every `provideRnForgeXConfig()` for an area you use is mandatory**, not optional sugar — components inject their config token and will throw or silently no-op without it. Missing `provideRnForgeBootstrapConfig` in particular means the vendor scripts never load, so `rnf-table`/`rnf-modal` render inert.

For each provider's full option shape, read its `*.config.ts` (path map in §0) — they're small, well-commented files.

### 3.3 App-shell template

```html
<rnf-header [options]="headerOptions" />
<main class="container-fluid mb-auto"><router-outlet /></main>
<rnf-footer [options]="footerOptions" />
<rnf-color-mode class="position-fixed" style="bottom: 4em; right: 1em" />
```

`headerOptions`/`footerOptions` nest brand, watermark, and navbar config in one object — see §5.5 and copy the real shape from `apps/ng-demo/src/app/app.ts`.

### 3.4 Routing pattern (auth-gated app)

```ts
export const appRoutes: Route[] = [
  { path: 'auth', component: AuthComponent, data: { options: { users: [...] } } },
  { path: 'error', component: ErrorComponent, data: { options: { code: 500 } } },
  {
    path: '',
    canActivateChild: [authRouteGuard],                      // gates everything below
    children: [
      { path: 'dashboard', component: DashboardPageComponent, data: { permission: 'app.dashboard' } },
      { path: 'user/profile', component: UserComponent },
      { path: 'user/settings', component: UserComponent },   // same component, branches on URL
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', component: ErrorComponent, data: { options: { code: 404 } } },
    ],
  },
];
```

`route.data.permission` is read by `authRouteGuard`; `route.data.options` is read by page components as a per-route config override layered on global config.

---

## 4. Core mental model — read before generating any component

Every ngkit UI component extends `ConfigurableComponent<TOptions>` (`libs/ng-bootstrap/src/lib/bootstrap.component.ts` — **read this file early**, it explains the whole library's shape). Consequently every component has:

- `[options]` — `Partial<TOptions>`, the declarative config bag (columns, buttons, header text, form controls…).
- `[htmlAttributes]` — arbitrary attributes applied to the host element.
- A `configKey` — where this component's app-wide defaults live in the merged config.
- Effective config resolved lowest → highest priority: **`defaultOptions()` → app-wide config at `configKey` → `[options]` input → runtime `updateOptions()`/`mergeOptions()`**.

**Implication:** don't invent per-page config shapes or fork components. Different defaults on different pages → different `[options]`. Same defaults everywhere → set once in the relevant `provideRnForgeXConfig()`, not repeated at every call site.

**Pages** extend `AbstractPage<TOptions>` (root EP, auth-free) or `AbstractAuthPage<TOptions>` (`/auth` EP, adds `isAuthenticated`/`userProfile`/`hasPermission()`). Both wire a `@ViewChild(AlertComponent) alert` plus `handleErrorResponse(httpError)` — call it from failed HTTP subscriptions so errors surface consistently through the page's alert. Default to `AbstractPage`; use `AbstractAuthPage` only when the page itself needs identity/permission checks beyond route gating. This split is a deliberate dependency boundary — using `AbstractPage` keeps `@rn-forge/ng/auth` out of the bundle entirely.

---

## 5. Entry-point map — what to reach for

Signatures live in Compodoc/Storybook/source (§0). This section is only about _which_ thing to use and _when_.

### 5.1 `@rn-forge/ng/core`

Utility layer, no UI. Reach for it when you need:

- **`LocalStorageService`** for any browser persistence — never raw `localStorage` (this namespaces keys per app). Prefer the never-throwing `tryGet`/`tryGetJSON`/`trySet`/`trySetJSON`/`tryRemove` methods over the strict `get`/`getJSON`/`set`/`setJSON`/`remove` when a storage failure shouldn't throw.
- **`FormUtil.VALIDATORS`** (`TEXT`/`NUMBER`/`DATE`/`DATE_RANGE`) for text/number/date validation — **not** hand-rolled `Validators.pattern` or custom validator functions. ngkit's form fields read errors from a specific shape (`control.errors['error']`); these validators produce it, ad-hoc ones won't display.
- **`DateUtil`** for ISO `YYYY-MM-DD` handling (incl. day-offset strings like `'-7'`, which several components accept).
- **`RouteService`** as a `Router`+`Location` facade; **`PubSubService<T>`** as a base for simple reactive services; **`ObjectUtil.diff`** for deep comparison.
- Debug mode: append `?__DEBUG` to any URL to turn on library-wide lifecycle/config logging. Useful when a component isn't picking up config you expected.

### 5.2 `@rn-forge/ng/auth`

JWT auth. **Zero-config default is fully open** (all permission checks pass) — auth only activates once `provideRnForgeAuthConfig(...)` is called. Reach for:

- **`authRouteGuard`** on a parent route's `canActivateChild` — never write a custom guard.
- **`authHttpInterceptor()`** in the `provideHttpClient` chain — never manually attach bearer tokens.
- **`*rnfHasPermission` / `*rnfHasAnyPermission`** structural directives for conditional rendering — never hand-write `@if (user.permissions.includes(...))`.
- **`AuthService`** for `login`/`logout`/`isAuthenticated`/`credentials` signal when you need programmatic access.

### 5.3 HTTP — Angular `HttpClient`, no ngkit wrapper

> Releases after 0.1.2 remove `@rn-forge/ng/http` and `/http/crud`. 0.1.2 still ships `AbstractHTTPService`/`BackendService`, but don't build new code on them. Rationale: [ADR-0004](https://github.com/rn-forge/ngkit/blob/main/docs/adr/ADR-0004.md).

- **One app-owned `InjectionToken<string>` per backend** (`ORDERS_API_URL`, `INVENTORY_API_URL`), provided once in `app.config.ts`.
- **API services inject `HttpClient` and their token directly**, one method per operation, calling native `get/post/put/patch/delete`. Prefer a client generated from the backend's OpenAPI document when one exists.
- **Query params:** pass `{ params: {...} }` — Angular encodes them. **Downloads:** `{ responseType: 'blob', observe: 'response' }`, then `AppUtil.saveBlob(blob, fileName)` from `/core`.
- **Errors:** one functional interceptor in `provideHttpClient(withInterceptors([...]))` for reporting/telemetry; rethrow the original `HttpErrorResponse`. Per-call `catchError` only where the caller recovers. OpenTelemetry setup: [the HTTP guide](https://github.com/rn-forge/ngkit/blob/main/docs/guides/http.md#telemetry-versions-checked-2026-09-22).
- **CRUD screens** take a `CrudDataSource` (§5.8): `standardDataSource()` for a standards-following backend, or your own implementation of the above.

### 5.4 `@rn-forge/ng-bootstrap` (root)

| Component    | Reach for it when                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rnf-alert`  | Any user-facing success/error/progress message. Imperative — get a `@ViewChild`, call `.success()`/`.error()`/`.start()`/`.stop()`. `AbstractPage` already gives you one as `this.alert`. Don't add a toast lib. |
| `rnf-button` | Any button. Bootstrap color via `[class]`, `[icon]` (Bootstrap Icons name, **no `bi-` prefix**), `[disabled]` accepts a function for dynamic state.                                                              |
| `rnf-error`  | Full-page error states — wire to your `ErrorHandler` and the `**` wildcard route.                                                                                                                                |
| `rnf-modal`  | Any dialog. Requires a `[bodyTemplate]` `ng-template`; no auto-open — call `.open()` via `@ViewChild`.                                                                                                           |
| `rnf-table`  | **Any tabular data** needing sorting/paging/selection/toolbars. Wraps bootstrap-table. Use the `ToolbarHelper` factory for standard add/update/delete/upload/download toolbar buttons.                           |

**Never hand-build a data table** from `*ngFor` over `<tr>`. Tree-grid (hierarchical rows) requires **both** `table: { treegrid: true }` globally (loads the plugin) **and** `treeEnable`/`treeShowField`/`parentIdField`/`rootParentId` per instance — see `apps/ng-demo/src/app/org-chart/`.

### 5.5 `@rn-forge/ng-bootstrap/shell`

App chrome. `provideRnForgeShellConfig({})` is required even when empty.

- **`rnf-header` / `rnf-footer`** — you configure these; they instantiate brand, watermark, and navbar internally from nested `[options]`. Don't compose `rnf-brand`/`rnf-navbar` yourself.
- **`rnf-navbar`** — driven by `items: NavItem[]`, each typed `'link'` (Angular `routerLink`), `'url'` (external `href`), `'callback'`, `'submenu'`, `'color-mode'`, or `'divider'`. Picking the wrong type silently breaks navigation. **It does zero permission filtering by design** — filter items yourself (e.g. a `computed()` checking `hasPermission()`) before passing them in.
- **`rnf-color-mode`** — light/dark/auto toggle; applies via Bootstrap 5's `data-bs-theme`, persists through `UserSettingsService`. No custom dark-mode CSS needed.

### 5.6 `@rn-forge/ng-bootstrap/form`

**Mental model:** `rnf-form` wraps Angular reactive forms; it is _not_ a schema DSL. `[options].controls` is exactly a `FormBuilder.group()` config. `rnf-form` renders the `<form>` shell (header, submit/cancel/reset) and projects your `[template]`, handing back `ctx.formGroup` for fields to bind to.

```ts
protected formOptions: Partial<FormOptions> = {
  header: 'New Product',
  controls: {
    name: ['', Validators.required],
    price: [null, FormUtil.VALIDATORS.NUMBER({ min: 0 })],
  },
  submitBtn: 'Save', cancelBtn: 'Cancel',
};
```

```html
<rnf-form #form [options]="formOptions" [template]="fields" (formSubmit)="onSubmit($event)" />
<ng-template #fields let-ctx>
  <rnf-input-field name="name" label="Name" [formGroup]="ctx.formGroup" />
  <rnf-input-field name="price" label="Price" type="number" [formGroup]="ctx.formGroup" />
  <rnf-dropdown-field name="category" label="Category" [optionList]="categories" [formGroup]="ctx.formGroup" />
</ng-template>
```

**Submitting auto-disables the form group** — call `form.enable()` in the `(formSubmit)` handler or it stays disabled.

Fields (all take `name` + `[formGroup]`, all live inside the `ng-template`): `rnf-input-field` (text/textarea/number/date/file), `rnf-dropdown-field` (native select), `rnf-typeahead-field`, `rnf-multi-typeahead-field` (badge chips), `rnf-rich-text-field` (Quill).

Two constraints worth knowing at design time: **typeahead takes a synchronous array only** — no built-in async/HTTP source, so fetch and assign yourself; and **rich-text hard-codes `required` + `minLength(10)`** on the editor regardless of your validators, so don't use it for optional or short fields. `apps/ng-demo/src/app/forms/` demonstrates every field type.

### 5.7 `@rn-forge/ng-bootstrap/auth`

UI layer over `@rn-forge/ng/auth` (configured separately — most apps call both `provideRnForgeAuthConfig` and `provideRnForgeAuthUiConfig`).

- **`AuthComponent`** — handles login and logout via `?mode=`. Its default is a **demo "pick a user" dropdown, not a production credential form** — plan to replace it (§8).
- **`UserComponent`** — profile and settings screens; route _both_ `/user/profile` and `/user/settings` to this one component.
- **`UserSettingsService`** — per-user persisted settings (theme, color mode, custom keys).

### 5.8 `@rn-forge/ng-bootstrap/crud` (with `@rn-forge/ng/crud`)

**The fastest path to a full CRUD screen** — list, add/update, delete-with-confirm, import, export. Use it for any "manage a list of X" page instead of assembling `rnf-table` + `rnf-form` + `rnf-modal` by hand.

**Three files per resource.** Copy `apps/ng-demo/src/app/products/` — it is the canonical implementation and more reliable than this sketch. `CrudDataSource`, `standardDataSource()`, `ReadModel`, `WriteModel` and `ListResponse` import from `@rn-forge/ng/crud` (not `ng-bootstrap`); IDs can be strings via the `$K` generic. `ListResponse` is AIP-158 (`{ items, nextPageToken, totalSize? }`), not the old DRF envelope. Releases up to 0.1.2 differ; this is the shape from the next release.

```ts
// foo.types.ts
export interface FooWrite extends WriteModel {
  id?: number | null;
  name: string;
}
export interface FooRead extends ReadModel {
  readonly id: number;
  readonly name: string;
}

// foo.manager.ts — component-scoped, NOT providedIn:'root'
@Injectable()
export class FooManager extends AbstractCrudManager<FooWrite, FooRead> {
  override readonly name = 'Foo';
  override permissionKey = 'app.foo'; // '' skips permission checks
  override readonly dataSource = standardDataSource<FooWrite, FooRead>({
    baseUrl: inject(API_URL), // one app-owned token per backend
    collection: '/foo',
    features: { batchDelete: true, import: true, export: ['text/csv'] },
  });
  override tableColumns(): ColumnOptions[] {
    /* mark sortable columns `sortable: true`; they write orderBy */
  }
  override addUpdateFormControls(): GenericType {
    /* ... */
  }
  override toAddUpdateFormValue(data: FooRead): FooWrite {
    return data;
  }
  override filterFields() {
    return [{ name: 'name', label: 'Name' }]; // named query parameters
  }
}

// foo.page.ts
@Component({ providers: [FooManager], templateUrl: './foo.page.html' })
export class FooPageComponent {
  readonly manager = inject(FooManager);
}
```

```html
<rnf-crud [manager]="manager" [addUpdateFormTemplate]="addUpdateTpl" />
<ng-template #addUpdateTpl let-ctx>
  <rnf-input-field name="name" label="Name" [formGroup]="ctx.formGroup" />
</ng-template>
```

The backend must follow the wire standards in `libs/ng/crud/README.md` (AIP-158 paging, `orderBy`, RFC 9457, merge patch with `ETag`, `:import`, `:batchDelete`, export by `Accept`). **A backend with its own shape** (a DRF envelope, a pre-standard API) implements `CrudDataSource` in the app and maps to the contract there; ngkit ships no adapter. Optional methods (`batchDelete`, `import`, `importTemplate`, `export`) hide their action when absent. Permission keys: `<key>.list|create|update|delete|import|export`.

The manager owns behaviour; `CrudComponent` is a dumb view shell. **Don't reimplement list-fetching, selection, paging, server-validation mapping, conflict handling or delete confirmation** — they come from `createCrudList()`, `problemToFormErrors()` and the manager. Override the manager's hooks instead; read `crud.manager.ts` for them (type coercion between read/write models is the most common need — see how `products.manager.ts` round-trips a boolean through a dropdown). The screen shows token paging (Previous/Next, `totalSize` only if the backend sends it), never numbered pages.

Note the manager is **component-scoped** (`providers: [FooManager]` on the page), not root-provided.

---

## 6. Guardrails

- **Prefer ngkit components over raw HTML/Bootstrap markup** for: data tables, forms, modals, alerts, app chrome, dark-mode, auth screens, and any list/create/edit/delete screen.
- **Don't duplicate global config.** Same setting on every table → set it once in `provideRnForgeBootstrapConfig`, not on every `[options]`.
- **Don't write custom auth guards, interceptors, or permission checks** — `authRouteGuard`, `authHttpInterceptor()`, `*rnfHasPermission` cover route gating, token attachment, and conditional rendering.
- **API services use `HttpClient` directly** (§5.3) — don't write a generic HTTP wrapper class; if the screen is standard CRUD, use `standardDataSource()` (or implement `CrudDataSource`) and extend `AbstractCrudManager`.
- **Use `FormUtil.VALIDATORS`** for text/number/date validation so errors render in ngkit's form fields.
- **All page components extend `AbstractPage`/`AbstractAuthPage`**, not bare `@Component` — that's what provides `this.alert` and `handleErrorResponse()`.
- **Icons are Bootstrap Icons names without the `bi-` prefix** (`icon="trash3"`); requires the theme `@use` in §3.1 or they render as empty boxes.
- **Zoneless + signals is the house style** — use `input()`/`signal()`/`computed()` over `@Input()`/manual subscriptions, matching the library itself.
- **When something doesn't match this document, read the source** (§0) — don't invent an API or work around it with vanilla Angular.

---

## 7. Design-phase checklist

Resolve before writing an implementation plan:

1. **Auth or no auth?** If yes: real credentials vs. the demo dropdown (expect to build a real login form), what permission keys exist, `loginPath`/`ignoreAppRoutes`.
2. **What are the CRUD resources?** Each is a 4-file quartet (§5.8). Enumerate them up front — one plan work-item per resource, not a generic "build the tables" task.
3. **Nav structure** — feeds header/footer navbar `items`; decide top-level sections now so shell composition isn't revisited per page.
4. **Theming** — any Bootstrap variable overrides (brand colors, fonts) for the `@use ... with (...)` clause.
5. **API shape** — one base-URL token per backend. Is there an OpenAPI document to generate clients from? For CRUD screens, does the backend follow the wire standards in §5.8 (AIP-158 `{items, nextPageToken}` lists, RFC 9457 errors, `ETag`), and is `id` a number or a string (`$K`)? If not, map it inside your own `CrudDataSource` implementation.
6. **Tree-grid needed?** Only enable `table: { treegrid: true }` if a resource genuinely has hierarchical rows — it costs an extra script load.
7. **Which entry points are actually needed?** Don't wire providers or peer deps for `/form`, `/crud`, `/auth`, `/shell` if unused — e.g. a public marketing site needs none of the auth/CRUD stack.
8. **Confirm the install path** (§2) — is there a published Release, or do tarballs need building/vendoring first? This blocks everything else.

---

## 8. What ngkit does _not_ provide

So the agent doesn't assume these exist:

- **No state management** (NgRx/Redux-style) — only `PubSubService` and signals. Complex cross-page state is the app's own problem.
- **No design system beyond Bootstrap 5 + Bootstrap Icons** — anything outside Bootstrap's visual vocabulary is app CSS.
- **No charting** — pair with Chart.js/ngx-charts if needed.
- **No production login form** — `AuthComponent`'s default is a demo user-picker; a real app must replace it.
- **No i18n wiring** beyond `@angular/localize` being a peer dep.
- **No SSR support story** — components assume a browser (`window`, `document`, jQuery plugins). Verify before assuming SSR compatibility.
