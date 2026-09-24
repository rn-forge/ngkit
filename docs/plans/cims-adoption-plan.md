# Plan 2 — Adopting ngkit inside the CIMS app

**Target app:** `/Users/rohitnarayanan/Devel/workspaces/walgreens/waf/cims`
**Libraries:** `@rn-forge/ng` (+ entry points), `@rn-forge/ng-bootstrap` (this repo)
**Status:** proposal — nothing here has been implemented.
**Companion document:** [cims-extraction-plan.md](cims-extraction-plan.md) (Plan 1 — the reverse direction).
**Also read:** [docs/ngkit-agent-guide.md](../ngkit-agent-guide.md) — the API reference for everything named below.

---

## Summary — the course of action

**Adopt `@rn-forge/ng` now. Do not adopt `@rn-forge/ng-bootstrap`.**

CIMS is Angular Material 22 with a bespoke design-token system (`--sp-*`, `--surface-*`, `--status-*`, `light-dark()`, shimmer skeletons, staggered entrance animations). `@rn-forge/ng-bootstrap` is Bootstrap 5 + **jQuery** + `bootstrap-table`. Adopting it means loading a second CSS framework and jQuery beside Angular Material, and rewriting all 20 feature templates against `rnf-table`/`rnf-form` — which would discard the design system that is currently the app's main asset, for no functional gain.

The headless half of ngkit is a different story: it maps onto CIMS almost perfectly, is invisible to the UI, and directly replaces code CIMS has hand-rolled or is about to hand-roll against its new Django backend.

| Phase | What                                                                                                                                                             | Visual impact | Risk       | Blocked by                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------- | ----------------------------------------------------- |
| **0** | Install ngkit from a local tarball, wire `provideRnForgeCoreConfig`                                                                                              | none          | low        | —                                                     |
| **1** | `@rn-forge/ng/core`: `LocalStorageService`, `RouteService`, `DEBUG_MODE`, `DateUtil`, `FormUtil.VALIDATORS`, `ObjectUtil`                                        | none          | low        | Phase 0                                               |
| **2** | `@rn-forge/ng/http`: `InventoryData` → `AbstractHTTPService`; typed downloads                                                                                    | none          | low        | Phase 0                                               |
| **3** | `@rn-forge/ng/http/crud` + `@rn-forge/ng/auth`: `BackendService` per resource; `RoleService`/`canEditGuard` → `AuthService`/`authRouteGuard`/`*rnfHasPermission` | none          | **medium** | Plan 1 **R2** (string ids); the Django API being live |
| **4** | Newly extracted headless libs: `createCollectionQuery`, `CsvUtil`, `ColorModeService`, `@rn-forge/ng-charts`                                                     | none          | low        | Plan 1 items I-1…I-5                                  |
| **5** | **Decision gate** — UI components                                                                                                                                | large         | high       | Plan 1 Tier B (`@rn-forge/ng-material`)               |

**Phase 3 is where the real payoff is.** CIMS's backend (`backend/openapi.yaml`) is Django REST Framework and already paginates as `{count, next, previous, results}` — _byte-identical_ to ngkit's `ListResponse<T>`. Every resource CIMS is about to wire by hand (`items`, `orders`, `transactions`, `reconciliations`, `vendor-prices`, `audit`) is a three-line `BackendService` subclass instead. Adopting _before_ that HTTP layer is written is worth more than adopting after.

**One hard blocker on Phase 3:** ngkit's `ReadModel.id` is `number`; CIMS ids are strings (`WIC-104882`, UUIDs). Plan 1 **R2** fixes this. After H2R, R2 is part of the `CrudDataSource` move and Phase 2/3 use `HttpClient` directly (see I-2). Until it lands, Phase 3's CRUD half cannot be done cleanly — the auth half can proceed independently.

**Phase 5 recommendation:** keep Material, and consume the components from a future `@rn-forge/ng-material` (Plan 1 Tier B) if and when that package exists. If it doesn't get funded, CIMS keeps its `shared/` components as-is — that is a perfectly good outcome, and Phases 0–4 still deliver most of the value.

**Decisions I need from you:**

1. **Confirm the UI verdict** (Material stays, Bootstrap is not adopted). Everything below assumes it. If you actually want CIMS on Bootstrap, that's a rewrite, not an adoption, and needs its own plan.
2. **Auth timing (Phase 3).** CIMS's `RoleService` is a demo role-switcher with no real identity. Replacing it with ngkit's JWT `AuthService` only makes sense once the Django side issues tokens. Do it now against a dev-minted JWT (ngkit's `apps/ng-demo/src/app/shared/demo-jwt.ts` is the pattern), or wait for real auth?
3. **Distribution.** ngkit npm publishing is disabled (`dryRun: true`). Phase 0 assumes vendored tarballs via `file:`. Acceptable, or should we publish to an internal registry first? A `.verdaccio` config exists in this repo, so a private registry may already be the intended path.

---

## 1. Current state of CIMS, as it bears on adoption

| Fact                                                                                        | Source                                            | Consequence                                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Angular `^22.0.0`, standalone, signals, `provideBrowserGlobalErrorListeners`                | `package.json`, `app.config.ts`                   | ✅ matches ngkit's `~22.0.6` peer range                                            |
| Package manager **npm**; plain Angular CLI (not Nx)                                         | `package.json`, `angular.json`                    | ⚠️ ngkit is pnpm/Nx — only affects how tarballs are produced, not consumption      |
| Angular **Material** + CDK; 13 Material entry points in use, `mat.theme()` in `styles.scss` | `styles.scss`, grep of `@angular/material/*`      | ⛔ the reason `ng-bootstrap` is out                                                |
| Zone-based change detection (no `provideZonelessChangeDetection`)                           | `app.config.ts`                                   | ⚠️ ngkit's own demo runs zoneless; ngkit works either way, but note the difference |
| **No unit tests** — `skipTests: true` for every schematic, no `*.spec.ts` in `src/`         | `angular.json`                                    | ⛔ no safety net. Phase 1 should add specs for anything it touches.                |
| Data is static JSON via `HttpClient` (`data/items.json` …)                                  | `core/services/inventory-data.ts`, `public/data/` | Phase 2 works today; Phase 3 waits on the API                                      |
| A DRF backend is in flight with `{count,next,previous,results}` pagination                  | `backend/openapi.yaml`, `docs/data-contracts.md`  | ✅ exact `ListResponse<T>` match                                                   |
| Resource ids are **strings**                                                                | `backend/openapi.yaml`, `core/models/item.ts`     | ⛔ blocked on Plan 1 R2                                                            |
| No auth; `RoleService` toggles between two hardcoded users                                  | `core/role.service.ts`, `core/users.ts`           | Phase 3 target                                                                     |
| Path aliases `@core/*`, `@shared/*`, `@features/*`                                          | `tsconfig.json`                                   | Keep; ngkit imports sit alongside                                                  |
| Reactive forms used in exactly **one** file                                                 | `features/inventory/item-form/item-form.ts`       | `FormUtil.VALIDATORS` has a small but real target                                  |
| 8 templates contain hand-written `<table>`                                                  | grep                                              | Phase 5 territory only                                                             |

---

## 2. What CIMS gets from each ngkit API

| ngkit API                                                                        | Replaces in CIMS                                                                         | Notes                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideRnForgeCoreConfig({ appName })`                                          | —                                                                                        | Required by `LocalStorageService`, `AuthService`, `rnf-header`. Zero cost.                                                                                                                                                                                          |
| `LocalStorageService`                                                            | raw `localStorage` in `core/theme.service.ts`                                            | Namespaces keys as `cims.<key>`. Migration needed for the existing `cims-theme` key.                                                                                                                                                                                |
| `RouteService`                                                                   | scattered `Router`/`Location` injection                                                  | Optional convenience. Low value; adopt opportunistically.                                                                                                                                                                                                           |
| `DEBUG_MODE` / `isDebugMode()`                                                   | `console.error` in `inventory-store.load()`                                              | `?__DEBUG` query-param-gated logging, app-wide.                                                                                                                                                                                                                     |
| `DateUtil`                                                                       | ad-hoc `86_400_000` arithmetic in `inventory-store.ts`, `report-view.ts`, `movements.ts` | `isPast/isFuture/isBetween/diffDate/isoFormat`. **Not** a full replacement — CIMS's day-bucket maths stays.                                                                                                                                                         |
| `FormUtil.VALIDATORS`                                                            | `Validators.pattern`/custom fns in `item-form.ts`                                        | `TEXT`, `NUMBER({min,max,decimalPlaces})`, `DATE`, `DATE_RANGE`. ⚠️ These only validate **dirty, non-empty** controls — read §I-1.4 before swapping.                                                                                                                |
| `AbstractHTTPService`                                                            | `core/services/inventory-data.ts`                                                        | Typed `GET/POST/PUT/DELETE`, debug logging, centralised error handling, `DOWNLOAD_GET/POST` with `Content-Disposition` filename parsing.                                                                                                                            |
| `HttpUtil.downloadFile`                                                          | the anchor dance in `shared/utils/csv-utils.ts`                                          |                                                                                                                                                                                                                                                                     |
| `BackendService<$Q,$S>`                                                          | the per-resource HTTP code CIMS hasn't written yet                                       | Blocked on R2. `list/create/read/update/delete/bulkCreate/bulkDelete/upload/download`.                                                                                                                                                                              |
| `AuthService` + `authRouteGuard` + `authHttpInterceptor()` + `*rnfHasPermission` | `core/role.service.ts` (incl. `canEditGuard`) and the 15+ `role.canEdit()` checks        | Real permission keys instead of a boolean role.                                                                                                                                                                                                                     |
| `basicHttpInterceptor(ignoreUrls, headers)`                                      | —                                                                                        | Useful for correlation-id / tenant headers once the API lands.                                                                                                                                                                                                      |
| `PubSubService<T>`                                                               | —                                                                                        | Skip. CIMS is signal-based; this is the RxJS-era alternative.                                                                                                                                                                                                       |
| `BaseComponent` / `AbstractPage`                                                 | —                                                                                        | **Skip.** `AbstractPage` is `ng-bootstrap` (pulls in `rnf-alert`). `BaseComponent` is lifecycle debug logging only, and its `@Component({template:''})` base doesn't compose with CIMS's `ChangeDetectionStrategy.OnPush` components cleanly enough to be worth it. |

---

## 3. Phase 5 — the UI decision gate, spelled out

| Option                                                                         | What it means                                                                                                                                                                                                                                                              | Verdict                                                                                    |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **A. Keep Material; consume `@rn-forge/ng-material`** when Plan 1 Tier B ships | CIMS's own `shared/` components move _into_ the library and come back as `rnm-*`. Visual output unchanged.                                                                                                                                                                 | ✅ **Recommended**                                                                         |
| **B. Re-platform to `@rn-forge/ng-bootstrap`**                                 | Remove `@angular/material`, add `bootstrap` + `jquery` + `bootstrap-table` + `bootstrap-icons`, rewrite 20 templates, replace 8 hand-written tables with `rnf-table`, replace `MatDialog` with `rnf-modal`, `mat-icon`→Bootstrap Icons, delete the token system, re-theme. | ⛔ Not recommended. Weeks of work, total visual regression, and jQuery back in the bundle. |
| **C. Hybrid — Material shell, `rnf-table` for data grids**                     | Two CSS frameworks loaded simultaneously; Bootstrap's Reboot resets Material's typography; `provideRnForgeBootstrapConfig` loads jQuery + bootstrap-table globally regardless.                                                                                             | ⛔ Worst of both.                                                                          |

Note that ng-bootstrap does **not** currently have equivalents for CIMS's page-header, breadcrumb, empty-state, skeleton, KPI card, status chip, gauge, or grouped side-nav — so Option B doesn't even trade like for like. That asymmetry is exactly what Plan 1 Tier B addresses.

---

# Implementation

Hand-off notes for the implementing agent:

- All paths below are relative to `/Users/rohitnarayanan/Devel/workspaces/walgreens/waf/cims` unless prefixed with `ngkit:`.
- CIMS uses **npm** (`package-lock.json`). Do not introduce pnpm there.
- CIMS has **no tests**. After each phase, validation is `npm run build` plus the manual smoke list in §I-6. Add `*.spec.ts` alongside anything you change — start with the files in Phase 1.
- Work phase by phase, one PR per phase. Every phase below is independently revertable.
- Do not change any `.html` or `.scss` in Phases 0–4. If a template edit seems necessary, stop — it means the phase boundary was crossed.

---

## I-0. Phase 0 — install ngkit

### 0.1 Produce tarballs

From this repo:

```sh
pnpm install
pnpm nx run-many -t pack --projects=ng,ng-bootstrap
# → dist/tarballs/rn-forge-ng-<version>.tgz
#   dist/tarballs/rn-forge-ng-bootstrap-<version>.tgz
```

Only `rn-forge-ng-*.tgz` is needed — **`ng-bootstrap` is not being adopted.**

Check for a published GitHub Release first (`gh release list --repo rn-forge/ngkit`); as of this writing the `v0.1.1` tag has no release assets, so the local-tarball path is the working one. Do not fabricate a download URL.

### 0.2 Vendor it into CIMS

```sh
mkdir -p vendor
cp <ngkit>/dist/tarballs/rn-forge-ng-*.tgz vendor/
```

`package.json`:

```jsonc
"dependencies": {
  "@rn-forge/ng": "file:vendor/rn-forge-ng-0.1.1.tgz",
  "build-url-ts": "^6.3.0",
  "jwt-decode": "^4.0.0",
  "lodash-es": "^4.18.1"
},
"devDependencies": { "@types/lodash-es": "^4.17.12" }
```

`build-url-ts`, `jwt-decode`, `lodash-es` are **peer dependencies of `@rn-forge/ng`** (see `ngkit:libs/ng/package.json`) — npm will not install them for you. Verify the exact version ranges against the tarball's `package.json#peerDependencies` rather than copying the numbers above.

Commit `vendor/*.tgz` (it's a pinned artifact, not a build output) and add a `README` note explaining how to refresh it.

### 0.3 Wire the root config

`src/app/app.config.ts` — add to `providers`:

```ts
import { provideRnForgeCoreConfig } from '@rn-forge/ng/core';
// …
provideRnForgeCoreConfig({ appName: 'cims', apiBasePath: '/api' }),
```

`appName` namespaces every `LocalStorageService` key as `cims.<key>`. Nothing else in Phase 0 changes.

### 0.4 Validate

```sh
npm ci && npm run build
```

Confirm the production bundle grew by only a few KB (the `ng` library is tree-shakeable and `sideEffects: false`; if it grew a lot, something pulled in a whole entry point).

**Done when:** the app builds and serves identically, with `provideRnForgeCoreConfig` in place.

---

## I-1. Phase 1 — `@rn-forge/ng/core`

### 1.1 `ThemeService` → `LocalStorageService`

`src/app/core/theme.service.ts` currently reads/writes the raw key `cims-theme`.

```ts
import { Injectable, effect, inject, signal } from '@angular/core';
import { LocalStorageService } from '@rn-forge/ng/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(LocalStorageService);
  readonly dark = signal(this.storage.get('theme') === 'dark');

  constructor() {
    effect(() => {
      const dark = this.dark();
      document.documentElement.classList.toggle('dark', dark);
      this.storage.set('theme', dark ? 'dark' : 'light');
    });
  }

  toggle() {
    this.dark.update((d) => !d);
  }
}
```

⚠️ **Migration:** the key changes from `cims-theme` to `cims.theme`, so existing users silently revert to light mode once. Either accept that (say so in the PR) or add a one-time read of the legacy key in the constructor and remove it. Prefer the one-time migration — it's four lines.

> This service is replaced wholesale in Phase 4 by ngkit's `ColorModeService`. Doing 1.1 first is still worth it: it's five minutes and it proves the DI wiring from Phase 0.

### 1.2 `isDebugMode()` for diagnostic logging

Replace the bare `console.error` in `core/state/inventory-store.ts#load()`'s catch, and add debug tracing to the store's mutation methods, gated on `isDebugMode()`. This gives the app a `?__DEBUG` switch for free. Do **not** remove the `console.error` — errors should still surface unconditionally; add debug logging alongside.

### 1.3 `DateUtil` where it fits

Targets, in order of value:

- `core/state/inventory-store.ts` — `daysLate()`, `reconAgeDays` use `Date.now() - new Date(x).getTime()` / `86_400_000`. `DateUtil` has no day-diff helper, so these stay. **Leave them.**
- `features/reports/report-view/report-view.ts` — date-window filters can use `DateUtil.diffDate('-30')` for the cutoff string.
- Anywhere formatting a `Date` as `YYYY-MM-DD` → `DateUtil.isoFormat(date)` (replaces `.toISOString().slice(0,10)`, which is **UTC-shifted** and therefore subtly wrong for local dates near midnight — `DateUtil.isoFormat` uses local getters. This is a real bug fix, not just tidying; it affects `inventory-store.dailyConsumptionByItem()`).

Be conservative here: only change sites where the semantics are identical or the change is the bug fix just described. Note in the PR that `dailyConsumptionByItem` bucketing changes behaviour near midnight.

### 1.4 `FormUtil.VALIDATORS` in `item-form.ts`

`features/inventory/item-form/item-form.ts` is the only reactive form in the app.

Map:

- numeric fields (`minThreshold`, `maxThreshold`, `reorderQty`, `unitCost`, `leadTimeDays`, `onHand`) → `FormUtil.VALIDATORS.NUMBER({ min: 0 })`, and `unitCost` → `NUMBER({ min: 0, decimalPlaces: 2 })`.
- `id` pattern check → `FormUtil.VALIDATORS.TEXT({ pattern: '…' })`.

⚠️ **Read this before swapping.** ngkit's validators start with `if (!control.dirty || !control.value) return null;` — they do **not** fire on pristine controls, and they do **not** enforce presence. So:

- keep `Validators.required` on every currently-required field; `FormUtil` does not replace it;
- `itemForm.markAllAsTouched()` in `submit()` marks _touched_, not _dirty_ — a user who submits an untouched form will not trigger these validators. Either also `markAsDirty()`, or keep native `Validators.min/max` for the submit-time checks and use `FormUtil` only for the richer rules (`decimalPlaces`).
- error shape differs: `FormUtil` returns `{ error: 'message string' }` rather than Angular's `{min: {...}}`. `item-form.html`'s error rendering must be updated to read `control.errors?.['error']`. **This is the one template edit permitted in Phase 1** — confine it to that file.

Given those caveats, the honest recommendation: adopt `NUMBER({decimalPlaces})` for `unitCost` (where it adds something native validators can't do) and leave the rest. Don't churn working validation for uniformity.

### 1.5 `ObjectUtil.diff` (opportunistic)

`InventoryStore.log()` stores before/after as `JSON.stringify` blobs. `ObjectUtil.diff(before, after)` produces a structured `{conflicts, missing_in_source, missing_in_target}` that the audit trail screen could render properly instead of showing raw JSON. Nice-to-have; only do it if `features/reports/audit/audit.ts` is being touched anyway.

### 1.6 Validate

`npm run build`; smoke: toggle dark mode and reload (persists), append `?__DEBUG` (debug logs appear), save an item with 3 decimal places in unit cost (rejected).

---

## I-2. Phase 2 — `@rn-forge/ng/http`

> **Superseded (2026-09-22, ngkit-roadmap H2R).** `@rn-forge/ng/http` and `/http/crud` are removed after 0.1.2. Phase 2 becomes: `InventoryData` injects `HttpClient` and an app-owned `CIMS_API_URL` token directly, and `downloadCsv` uses `AppUtil.saveBlob` from `@rn-forge/ng/core`. The Phase 3 CRUD half implements `CrudDataSource<$Q, $S, string>` from `@rn-forge/ng-bootstrap/crud` over `HttpClient` (same DRF `ListResponse`, string IDs built in) instead of subclassing `BackendService`. The code below describes the 0.1.2 API and is kept for reference.

### 2.1 `InventoryData` → `AbstractHTTPService`

`src/app/core/services/inventory-data.ts` today is six `firstValueFrom(this.http.get<T>('data/x.json'))` calls.

```ts
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AbstractHTTPService } from '@rn-forge/ng/http';
import { AuditEntry, Item, Order, Reconciliation, Txn, VendorPrice } from '@core/models';

@Injectable({ providedIn: 'root' })
export class InventoryData extends AbstractHTTPService {
  constructor() {
    super('');
  } // base path = apiBasePath

  getItems() {
    return firstValueFrom(this.GET<Item[]>('getItems', 'items'));
  }
  getTransactions() {
    return firstValueFrom(this.GET<Txn[]>('getTransactions', 'transactions'));
  }
  getOrders() {
    return firstValueFrom(this.GET<Order[]>('getOrders', 'orders'));
  }
  getReconciliations() {
    return firstValueFrom(this.GET<Reconciliation[]>('getReconciliations', 'reconciliations'));
  }
  getVendorPrices() {
    return firstValueFrom(this.GET<VendorPrice[]>('getVendorPrices', 'vendor-prices'));
  }
  getAudit() {
    return firstValueFrom(this.GET<AuditEntry[]>('getAudit', 'audit'));
  }
}
```

⚠️ **Path shape changes.** `AbstractHTTPService.getEndpoint()` always emits a **trailing slash** (`/api/items/`) and prefixes `apiBasePath`. The current static files are at `data/items.json` with no prefix. Two options:

- **(a) Recommended:** add `provideRnForgeHttpConfig({ apiBasePath: '/api' })` and stand up the Django API behind `/api` — i.e. do Phase 2 _when the backend is reachable_, and keep the JSON files as a dev fallback behind an environment flag. DRF conventionally serves trailing-slash URLs, so the trailing slash is correct there.
- **(b)** Point `apiBasePath` at `data` and override `getEndpoint()` to append `.json` instead of `/`. This works but is a hack that gets deleted in a month.

Take (a). If the API isn't ready, **defer Phase 2 entirely** — there is no value in converting a static-file loader.

Add `provideRnForgeHttpConfig({ apiBasePath: '/api' })` to `app.config.ts` (it is separate from `provideRnForgeCoreConfig`'s `apiBasePath`, which is not read by the http layer).

### 2.2 CSV download

`shared/utils/csv-utils.ts#downloadCsv` duplicates `HttpUtil.downloadFile`. Replace the body:

```ts
import { HttpUtil } from '@rn-forge/ng/http';

export function downloadCsv(filename: string, csv: string): void {
  HttpUtil.downloadFile({
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    fileName: filename,
  });
}
```

Keep `toCsv` as-is until Phase 4 replaces it with `CsvUtil` (Plan 1 I-1).

If the backend gains server-side exports, use `DOWNLOAD_GET`/`DOWNLOAD_POST` on `InventoryData` — they parse `Content-Disposition` for the filename, which CIMS currently can't do.

### 2.3 Validate

`npm run build`; every screen still loads its data; a CSV export from the Report Center still downloads with the right filename.

---

## I-3. Phase 3 — `@rn-forge/ng/http/crud` and `@rn-forge/ng/auth`

> **CRUD half superseded** — see the note at the top of I-2. The auth half is unaffected.

Two independent halves. Do the auth half first — it isn't blocked.

### 3A. Auth: replace `RoleService`

`core/role.service.ts` exposes `role` (a 2-value signal), `canEdit()`, `userName()`, `roleLabel()`, and a `canEditGuard: CanMatchFn`. It's consumed by `app.html`, `app.routes.ts` (4 routes), `command-palette.ts`, and ~15 call sites in `inventory-store.ts` that early-return with a `console.warn` on write attempts.

**Target permission model** — define the keys first, they're the contract:

| Key                      | Gates                                                     |
| ------------------------ | --------------------------------------------------------- |
| `cims.inventory.edit`    | item create/update, activate/deactivate, stock adjustment |
| `cims.operations.record` | receiving, consumption, weekly count                      |
| `cims.purchasing.edit`   | order create/update/submit, suggestion dismissal          |

(Or a single `cims.edit` if you want an exact behavioural match to today's boolean. Recommended: start with one key, split later — a migration that changes both the mechanism _and_ the granularity at once is hard to review.)

**Steps**

1. `app.config.ts`:

   ```ts
   provideRnForgeAuthConfig({
     frontend: {
       disableAuth: false,          // ← REQUIRED, see the warning below
       loginPath: '/auth',
       ignoreAppRoutes: ['/auth', '/error'],
     },
     backend: { ignoreBackendURLs: ['/api/auth/'] },
   }),
   provideHttpClient(withFetch(), withInterceptors([authHttpInterceptor()])),
   ```

   ⚠️ **`disableAuth` defaults to `true` and survives the merge.** `provideRnForgeAuthConfig` deep-merges your config over `DEFAULT_RN_FORGE_AUTH_CONFIG`, which sets `frontend.disableAuth: true` (`ngkit:libs/ng/auth/src/lib/auth.config.ts:58`, `auth.providers.ts:49-51`). If you don't pass `disableAuth: false` explicitly, the provider binds `AllowAnyPermission` + `AnonymousCredentials`, `AuthService.isAuthenticated` hardcodes `true`, and **every guard and permission check silently passes** — the app looks like it works and enforces nothing. (Note: [docs/ngkit-agent-guide.md](../ngkit-agent-guide.md) §5.2 says auth "activates once you call `provideRnForgeAuthConfig`" — that is not accurate; the flag is what activates it.)

   The upside of that default: you can land steps 2–5 with `disableAuth: true` and flip the single flag last, so the whole migration is testable before it starts enforcing anything.

2. Replace `canEditGuard` with `authRouteGuard` on the parent route, and move the permission onto route data:
   ```ts
   { path: 'inventory', canActivateChild: [authRouteGuard], children: [
       { path: 'items/new', data: { permission: 'cims.edit', breadcrumb: [...] }, loadComponent: … },
   ]}
   ```
   ⚠️ `authRouteGuard` is a `CanActivateChildFn`; `canEditGuard` is a `CanMatchFn`. `canMatch` failing lets the router fall through to the next matching route (today: the `**` → `/home` redirect). `canActivateChild` failing redirects to `loginPath`. Behaviour on denial therefore changes — decide deliberately and note it in the PR.
3. Templates: `@if (role.canEdit())` → `*rnfHasPermission="'cims.edit'"`. `app.html`'s read-only badge becomes the negated case (keep the `@if` there, driven by `authService.hasPermission(...)`, since there's no "unless" directive).
4. `inventory-store.ts`: replace `if (!this.role.canEdit())` guards with `if (!this.auth.hasPermission('cims.edit'))`. **Keep the guards** — they're defence in depth behind the UI checks.
5. `userName()` / `roleLabel()` come from `authService.credentials()`. Delete `core/users.ts`.
6. **Dev identity:** until Django issues JWTs, mint one client-side. Copy the pattern from `ngkit:apps/ng-demo/src/app/shared/demo-jwt.ts` and keep the two-role switcher in the topbar as a dev-only affordance that calls `authService.login(token)` with a different permission set. Gate it behind `isDebugMode()` or an environment flag so it can't ship to production.

**Do not** adopt `AuthComponent`/`UserComponent` from `@rn-forge/ng-bootstrap/auth` — Bootstrap UI. CIMS keeps its own login screen when it needs one.

### 3B. CRUD: `BackendService` per resource

**Blocked on Plan 1 R2** (string-id generics) and on the API being live. Once both are true:

```ts
// core/services/items.service.ts
export interface ItemWrite extends WriteModel<string> {
  id?: string | null;
  name: string; /* … */
}
export interface ItemRead extends ReadModel<string> {
  readonly id: string;
  readonly name: string; /* … */
}

@Injectable({ providedIn: 'root' })
export class ItemsService extends BackendService<ItemWrite, ItemRead, string> {
  constructor() {
    super('items');
  }
}
```

One such service per resource: `items`, `orders`, `transactions`, `reconciliations`, `vendor-prices`, `audit`. `InventoryStore` then calls `itemsService.list()` etc. instead of `InventoryData`, and its mutation methods POST/PUT before updating signals — which is the change `inventory-store.ts`'s own comment (`// Future API mutations use docs/data-contracts.md endpoints before/while updating signals`) is already planning for.

⚠️ Check each endpoint against `backend/openapi.yaml` before assuming the default paths fit. `BackendService` hardcodes `upload` → `POST {root}/upload/`, `download` → `POST {root}/download/`, `bulkCreate` → `POST {root}/bulk-create/`, `bulkDelete` → `DELETE {root}/bulk-delete/`. If DRF exposes different routes, override the individual methods rather than reshaping the API.

⚠️ `list()` defaults `limit=2000`. DRF's default page-size parameter is usually `limit`/`offset` (LimitOffsetPagination) or `page` (PageNumberPagination) — confirm which the backend uses; with `PageNumberPagination`, `limit` is ignored and you'll silently get page 1.

**Do not** adopt `AbstractCrudManager` / `rnf-crud` — those render Bootstrap.

### 3C. Validate

Build; then verify: read-only role can't reach `/inventory/items/new` (and lands where you decided in step 2); edit-capable role can; store mutations rejected for read-only; every list screen still populates.

---

## I-4. Phase 4 — newly extracted headless libraries

Depends on [Plan 1](cims-extraction-plan.md) items I-1…I-5 landing and a fresh tarball.

| Plan 1 item                     | CIMS change                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I-1 `CsvUtil`**               | Delete `shared/utils/csv-utils.ts`; update the ~4 import sites (`report-view.ts`, `reports.ts`, `movements.ts`, `audit.ts`) to `CsvUtil.download(...)`. Column defs already match the `{key,label}` shape.                                                                                                                                                                                                                                                                              |
| **I-2 `DateUtil.relative`**     | Delete `shared/utils/date-utils.ts`; `movements.ts` imports `DateUtil.relative`. ⚠️ Output changes for future-dated rows (CIMS renders them as `1m ago`; the library version says `in Nm`). Check the movement/audit screens for future timestamps.                                                                                                                                                                                                                                     |
| **I-3 `createCollectionQuery`** | **The big one.** Rewrite the filter/sort blocks in `catalog.ts` (~90 lines → ~15), `movements.ts`, `audit.ts`, `pricing.ts`, `orders.ts`, `replenishment.ts`. Templates bind to `query.page()` / `query.matched()` / `query.counts(...)` instead of bespoke computeds. Do **one screen per PR**, starting with `catalog.ts` — it exercises search debounce, 4 filters, chip counts, and a custom `cover` comparator (`Infinity` handling), so if the API fits there it fits everywhere. |
| **I-4 `ColorModeService`**      | Delete `core/theme.service.ts`. `provideRnForgeColorMode({ darkClass: 'dark', setColorScheme: true })` in `app.config.ts`. `app.html`'s toggle calls `colorMode.toggle()`; `theme.dark()` → `colorMode.resolved() === 'dark'`. Bonus: `'auto'` mode (follow OS) that CIMS doesn't have today.                                                                                                                                                                                           |
| **I-5 `@rn-forge/ng-charts`**   | Delete `shared/charts.ts` and `core/chart-theme.ts`; replace the `provideEchartsCore` block in `app.config.ts` with `provideRnForgeEcharts()`. ⚠️ The library reads theme colors from CSS custom properties — verify CIMS's `--status-*`/`--text-*` names match what the library expects, or pass an override map.                                                                                                                                                                      |

Each of these is independently revertable. Sequence: I-1, I-2, I-4 (small, mechanical) → I-5 → I-3 (six PRs).

---

## I-5. Phase 5 — UI (gated)

Do not start without an explicit decision on Plan 1 Tier B.

If `@rn-forge/ng-material` ships, the migration is mechanical because the library components _came from_ CIMS:

1. Add the dependency and `@use '@rn-forge/ng-material/assets/tokens'` at the top of `styles.scss`; remove the now-duplicated `--sp-*`/`--radius-*`/`--surface-*`/`--shadow-*`/`--status-*` block and the `.app-card`/`.enter-*`/shimmer keyframes.
2. Swap component by component, in this order (least → most coupled): `app-skeleton` → `rnm-skeleton`, `app-page-header` → `rnm-page-header`, `app-empty-state` → `rnm-empty-state`, `app-threshold-chip` → `rnm-status-chip` (**now needs an explicit `label` and a `tone`, since the library version doesn't know `StockStatus`** — add a small `toneOf(item)` helper in `@core/models`), `app-kpi-card` → `rnm-kpi-card`, `app-stock-gauge` → `rnm-gauge` (pass `thresholds`), `app-breadcrumb` → `rnm-breadcrumb`, `app-side-nav` → `rnm-side-nav` (pass `groups`, `home`, and a `badgeResolver` closing over `InventoryStore`), `app-command-palette` → `rnm-command-palette` (register CIMS's nav/action/item commands with `CommandRegistry`).
3. Delete each `shared/*.ts` only after its replacement is in place and the screen has been visually diffed.

Take before/after screenshots of every screen in both color modes. There is no test suite to catch a regression here.

---

## I-6. Validation and rollback

**Per phase:**

```sh
npm ci
npm run build                 # must stay within the 1 MB initial / 2 MB error budget in angular.json
npm start                     # http://localhost:4444
```

**Manual smoke list** (there are no automated tests — this _is_ the test suite):

1. Home dashboard renders KPIs and charts.
2. `/inventory/items` — search, each status chip, category + vendor filters, all three sort columns.
3. `/inventory/items/:id` — gauge, movement history, adjust-stock dialog.
4. `/inventory/items/new` — validation errors on every constrained field; save.
5. `/inventory/movements` — type chips, source filter, date window, relative timestamps.
6. `/purchasing/{replenishment,orders,orders/:id,pricing}`.
7. `/operations/{receiving,consumption,counts}` — each write path, and the undo on consumption.
8. `/reports` — open each report, change filters, export CSV, check the file contents.
9. `/reports/audit`.
10. ⌘K palette — nav, actions, item search, arrow keys, Enter, Esc.
11. Dark mode toggle + reload persistence.
12. Role switch → read-only affordances hidden, guarded routes blocked.

**Rollback:** each phase is one PR touching disjoint files. Reverting Phase _n_ never requires reverting Phase _n−1_. Phase 0 (the dependency) is the only one everything else sits on; keep `vendor/*.tgz` in git so a revert doesn't need a network fetch.

**Add tests as you go.** CIMS sets `skipTests: true` for every schematic and has no `*.spec.ts` in `src/`. At minimum, add specs for `core/state/inventory-store.ts` mutations and for whatever Phase 4 rewrites — a 600-line signal store with no tests is the single largest risk in this whole plan, independent of ngkit.
