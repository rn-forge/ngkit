# Plan 1 — Extracting reusable libraries from CIMS into ngkit

**Source app reviewed:** `/Users/rohitnarayanan/Devel/workspaces/walgreens/waf/cims` (`src/`)
**Target repo:** this repo (`rn-forge/ngkit`)
**Status:** proposal — nothing here has been implemented.
**Companion document:** [cims-adoption-plan.md](cims-adoption-plan.md) (Plan 2 — the reverse direction).

---

## Summary — the course of action

CIMS is an Angular 22, standalone, signals-first **Angular Material** app (~8.2k lines across `features/`, plus a `shared/` and `core/` layer), backed today by static JSON and, in flight, a Django/DRF backend (`backend/openapi.yaml`). ngkit's UI layer is **Bootstrap 5 + jQuery bootstrap-table**. That single mismatch drives the whole plan: CIMS's genuinely reusable assets split cleanly into three buckets, and only one of them can land in the libraries that exist today.

| Tier                  | What                                                                                                        | Destination                                                              | Why                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — headless**      | Collection query engine, CSV export, relative-time helper, color-mode service, report engine, chart theming | `@rn-forge/ng/*` (new secondary entry points) + one new optional package | Zero UI-framework coupling. Drops straight into the existing `ng` library, usable from Bootstrap _and_ Material apps.                                |
| **B — UI, Material**  | PageHeader, Breadcrumb, EmptyState, Skeleton, KpiCard, StatusChip, Gauge, grouped SideNav, Command palette  | **new `@rn-forge/ng-material` library**                                  | These are real gaps (ng-bootstrap has none of them either), but the implementations are Material-flavoured. A sibling UI package is the honest home. |
| **C — don't extract** | Inventory domain models, `InventoryStore` business logic, nav constants, integration gateways, seed data    | stays in CIMS                                                            | Domain-specific. Extracting these buys nothing and couples ngkit to one client's problem space.                                                      |

**The recommendation in one line:** do Tier A now (it is small, high-leverage, and unblocks Plan 2 immediately); treat Tier B as a separate, explicitly funded decision because it means committing to maintaining a second UI package.

**Highest-value single item:** the client-side **collection query engine** (filter + search + multi-key sort + debounce, §I-3). Six CIMS screens hand-roll it (`catalog`, `movements`, `audit`, `pricing`, `orders`, `replenishment`) with ~600 lines of near-duplicate `computed()` chains, and ngkit has no equivalent for apps that don't use the jQuery `rnf-table`.

**Three enabling refactors inside ngkit** are prerequisites and are worth doing regardless of whether Tier B ever happens:

- **R1** — lift `ConfigurableComponent` / `ConfigurerService` out of `@rn-forge/ng-bootstrap` into `@rn-forge/ng/core`, so any UI package (Material, or a future one) can reuse the options-resolution model.
- **R2** — generalise `ReadModel.id` / `WriteModel.id` / `BackendService` from `number` to `string | number`. **The CIMS backend uses string ids** (`WIC-xxxxxx`, UUIDs — `backend/openapi.yaml`), so today `BackendService` literally cannot type CIMS's resources. This blocks Plan 2 Phase 3.
- **R3** — decouple `rnf-color-mode` from `UserSettingsService` (`@rn-forge/ng-bootstrap/auth`), so dark mode does not drag the auth entry point into no-auth apps.

**Decisions I need from you** (everything else I can carry on assumptions):

1. **Is `@rn-forge/ng-material` in scope at all?** If no, Tier B is dropped and CIMS keeps its own `shared/` components forever (which is a defensible answer). Plan 2 is written to work either way.
2. **Charts:** separate package (`@rn-forge/ng-charts`) or an optional entry point? A `@rn-forge/ng` entry point would put `echarts`/`ngx-echarts` into `ng`'s peer deps for every consumer, which I'd rather avoid → I've planned it as a separate package.
3. **Does R2 (string ids) get done as a breaking change to `BackendService`, or as an additive generic with `number` defaulted?** I've planned the additive route (no break for existing consumers).
4. **Report engine (§I-6):** genuinely reusable, but it's the largest single extraction (~780 lines to generalise). Worth it now, or park it until a second app needs it? My recommendation: park it — write down the interface, extract on second demand.

---

## 1. What was reviewed

| Area             | Files                                                                                                                                                                              | Notes                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Shell / app      | `src/app/app.ts`, `app.config.ts`, `app.routes.ts`, `app.html`                                                                                                                     | Standalone, `provideBrowserGlobalErrorListeners`, `withComponentInputBinding`, mock gateways swapped by DI.                 |
| Core             | `core/theme.service.ts`, `role.service.ts`, `navigation.ts`, `integrations.ts`, `chart-theme.ts`, `users.ts`, `models/*`, `services/inventory-data.ts`, `state/inventory-store.ts` | `InventoryStore` is a ~600-line signal store with derived state + mutations + audit journal.                                |
| Shared           | `shared/{breadcrumb,page-header,kpi-card,empty-state,skeleton,threshold-chip,stock-gauge,command-palette,charts,side-nav}.ts`, `shared/utils/{csv-utils,date-utils}.ts`            | This is the extraction surface.                                                                                             |
| Features         | 20 screens under `features/`                                                                                                                                                       | Reviewed for repeated patterns, not for extraction.                                                                         |
| Styling          | `src/styles.scss`, `src/styles/_theme-colors.scss`                                                                                                                                 | `mat.theme()` + a hand-rolled `--sp-*` / `--radius-*` / `--status-*` / `--surface-*` token layer.                           |
| Backend contract | `backend/openapi.yaml`, `docs/data-contracts.md`                                                                                                                                   | DRF pagination `{count, next, previous, results}` — **already exactly** ngkit's `ListResponse<T>`. String `id`s throughout. |

---

## 2. Classification

### Tier A — headless, extract into `@rn-forge/ng`

| #   | CIMS source                                                                                                      | Proposed home                                           | Value                                                                                                               | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| A-1 | `shared/utils/csv-utils.ts` (`toCsv`, `downloadCsv`)                                                             | `@rn-forge/ng/core` → `CsvUtil`                         | High — every list screen exports CSV; ngkit has blob download (`AppUtil.saveBlob`, since H2R) but no CSV serialiser | S      |
| A-2 | `shared/utils/date-utils.ts` (`relTime`)                                                                         | `@rn-forge/ng/core` → `DateUtil.relative()`             | Medium — `DateUtil` already exists, this is one method                                                              | XS     |
| A-3 | filter/search/sort logic duplicated across 6 feature screens                                                     | **new** `@rn-forge/ng/data` → `createCollectionQuery()` | **Highest** — removes ~600 lines of duplication in CIMS alone                                                       | M      |
| A-4 | `core/theme.service.ts`                                                                                          | `@rn-forge/ng/core` → `ColorModeService`                | High — also fixes R3 for ng-bootstrap                                                                               | S      |
| A-5 | `shared/charts.ts` + `core/chart-theme.ts`                                                                       | **new package** `@rn-forge/ng-charts`                   | Medium — fills a documented ngkit gap ([agent guide §8](../ngkit-agent-guide.md))                                   | M      |
| A-6 | `features/reports/report-view/report-view.ts` (report registry: columns + row builders + totals + formats + CSV) | **new** `@rn-forge/ng/reporting` (headless defs only)   | Medium — powerful, but large; recommend deferring                                                                   | L      |
| A-7 | `InventoryStore.log()` / audit-journal pattern                                                                   | `@rn-forge/ng/core` → `AuditTrailService`               | Low–Medium — nice pattern, thin payoff                                                                              | S      |
| A-8 | Command matching/ranking inside `shared/command-palette.ts`                                                      | `@rn-forge/ng/core` → `CommandRegistry` (headless half) | Medium — pairs with a Tier B renderer                                                                               | S      |

### Tier B — Material UI, only if `@rn-forge/ng-material` is approved

| CIMS source                   | Component                             | Notes                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/page-header.ts`       | `rnm-page-header`                     | Title + subtitle + projected actions. Trivial; ng-bootstrap should get one too.                                                                                                                            |
| `shared/breadcrumb.ts`        | `rnm-breadcrumb`                      | Currently reads `route.snapshot.data['breadcrumb']` **once, non-reactively** — generalise to a `computed()` over `router.events` on the way in (existing latent bug, see §5).                              |
| `shared/empty-state.ts`       | `rnm-empty-state`                     | Icon ring + title + message + projected CTA.                                                                                                                                                               |
| `shared/skeleton.ts`          | `rnm-skeleton`                        | Pure CSS shimmer; needs the `@keyframes app-shimmer` from `styles.scss` moved into the component.                                                                                                          |
| `shared/kpi-card.ts`          | `rnm-kpi-card`                        | Includes an animated count-up honouring `prefers-reduced-motion`. Generalise `tone` off the inventory palette onto semantic names.                                                                         |
| `shared/threshold-chip.ts`    | `rnm-status-chip`                     | Generalise: `status` is currently the inventory `StockStatus` union — replace with `'success'\|'warning'\|'danger'\|…` + a label map input.                                                                |
| `shared/stock-gauge.ts`       | `rnm-gauge`                           | SVG arc gauge. Generalise: drop `stockStatus()`, take `value/min/max/thresholds/unit` + a `tone` resolver input.                                                                                           |
| `shared/side-nav.ts`          | `rnm-side-nav`                        | Grouped, collapsible, badged, auto-expands the active group, full a11y (`aria-expanded`/`aria-controls`/`aria-current`). Best single component in the app. Generalise the `badges` computed into an input. |
| `shared/command-palette.ts`   | `rnm-command-palette`                 | ⌘K palette. Split headless (A-8) from the Material dialog renderer.                                                                                                                                        |
| `src/styles.scss` token block | `@rn-forge/ng-material/assets/tokens` | `--sp-*`, `--radius-*`, `--status-*`, `--surface-*`, `--shadow-*`, `.app-card`, `.enter-*`, shimmer keyframes.                                                                                             |

### Tier C — do not extract

`core/models/*` (Item/Order/Txn/Reconciliation/VendorPrice/Audit + `stockStatus`/`varianceOf`/`orderValue`), `core/state/inventory-store.ts` (burndown, days-of-cover, reorder suggestions, receiving, reconciliation posting), `core/navigation.ts`, `core/users.ts`, `core/integrations.ts`, `core/services/inventory-data.ts`, `public/data/*.json`, all of `features/`.

`core/role.service.ts` is also Tier C — **but for the opposite reason**: ngkit already covers it (`AuthService.hasPermission`, `authRouteGuard`, `*rnfHasPermission`). It's an adoption target for Plan 2, not an extraction source.

---

## 3. Enabling refactors (prerequisites)

### R1 — lift the configurable-component machinery into `@rn-forge/ng/core`

Today [libs/ng-bootstrap/src/lib/bootstrap.component.ts](../../libs/ng-bootstrap/src/lib/bootstrap.component.ts) owns `ConfigOptions`, `Configurable`, `ConfigurerService`, and `ConfigurableComponent` — the four-layer options resolution (`defaultOptions()` → app config → `[options]` input → runtime overrides) that _every_ ngkit component is built on. Nothing in it is Bootstrap-specific except the config token it injects (`RN_FORGE_BOOTSTRAP_CONFIG_TOKEN`) and `StyleHelper`.

Move the machinery down to `@rn-forge/ng/core` against a renamed, UI-neutral token (`RN_FORGE_UI_CONFIG_PARTS` / `RN_FORGE_UI_CONFIG_TOKEN`), leave `StyleHelper` and the vendor-script `provideAppInitializer` in ng-bootstrap, and re-export the moved symbols from `@rn-forge/ng-bootstrap` so **no consumer import changes**.

Without R1, `@rn-forge/ng-material` either duplicates the machinery or depends on `@rn-forge/ng-bootstrap` (and therefore on jQuery + Bootstrap CSS). Both are unacceptable.

### R2 — generalise resource id types

> **Folded into `@rn-forge/ng-bootstrap/crud` (2026-09-22; ngkit-roadmap H4 replaces the contract).** `ng/http/crud` is removed. The `$K` key generic lands on `CrudDataSource`, `ReadModel` and `WriteModel` as they move into `@rn-forge/ng-bootstrap/crud`. The paths and `BackendService` signature below are the 0.1.2 state.

[libs/ng/http/crud/src/lib/crud.types.ts](../../libs/ng/http/crud/src/lib/crud.types.ts) hardcodes `id: number`, and [crud.services.ts](../../libs/ng/http/crud/src/lib/crud.services.ts) takes `read(id: number)` / `update(id: number, …)` / `delete(id: number)` / `bulkDelete(ids: number[])`.

CIMS's ids are strings (`WIC-104882`, UUIDs). Add a key generic defaulted to `number` so existing consumers are untouched:

```ts
export interface ReadModel<$K extends string | number = number> extends BaseResponse { readonly id: $K; }
export interface WriteModel<$K extends string | number = number> extends BaseRequest { id?: $K | null; }
export abstract class BackendService<$Q extends WriteModel<$K>, $S extends ReadModel<$K>, $K extends string | number = number> extends AbstractHTTPService { … }
```

`AbstractCRUDManager` ([libs/ng-bootstrap/crud/src/lib/crud/crud.manager.ts](../../libs/ng-bootstrap/crud/src/lib/crud/crud.manager.ts)) has to thread the same parameter through.

### R3 — decouple color mode from the auth entry point

[libs/ng-bootstrap/shell/src/lib/color-mode/color-mode.ts](../../libs/ng-bootstrap/shell/src/lib/color-mode/color-mode.ts) injects `UserSettingsService` from `@rn-forge/ng-bootstrap/auth`. So a no-auth app that just wants a dark-mode toggle pulls in the entire auth UI entry point. Rebase it on the headless `ColorModeService` from A-4 (which persists through `LocalStorageService`), and keep the `UserSettingsService` sync as an optional injection.

---

## 4. Package layout after Tier A + Tier B

```
@rn-forge/ng                 (existing)
  /core                      + CsvUtil, DateUtil.relative, ColorModeService,
                               CommandRegistry, AuditTrailService,
                               ConfigurableComponent & friends (R1)
  /auth                      (unchanged)
  /http                      (unchanged)
  /http/crud                 R2: keyed generics
  /data                      NEW — createCollectionQuery, paginate, sort/filter primitives
  /reporting                 NEW (deferred) — ReportDef, ReportRunner, report→CSV

@rn-forge/ng-bootstrap       (existing) — re-exports R1 symbols, color mode rebased (R3)

@rn-forge/ng-material        NEW (Tier B) — mirrors ng-bootstrap's EP layout:
  (root)                     page-header, empty-state, skeleton, kpi-card,
                             status-chip, gauge, breadcrumb, command-palette
  /shell                     side-nav, topbar, color-mode toggle
  /assets                    design tokens SCSS

@rn-forge/ng-charts          NEW (optional) — ChartAutosize directive, ChartThemeService
                             (peers: echarts, ngx-echarts)
```

---

## 5. Risks, caveats, non-goals

- **Two UI packages is a real maintenance cost.** ng-bootstrap has Storybook, Compodoc, release wiring, and a demo app. A Material sibling needs all four or it rots. This is the single biggest reason Tier B is a separate decision.
- **Latent bug carried in from CIMS:** `shared/breadcrumb.ts` snapshots `ActivatedRoute` in the field initialiser, so the breadcrumb is stale on same-component navigations (`/inventory/items/:id` → another id). Fix during extraction, don't port as-is.
- **`stock-gauge` and `threshold-chip` import `@core/models`.** Their extracted forms must take a tone/label mapping as input; don't smuggle inventory semantics into a UI library.
- **`kpi-card`'s count-up calls `matchMedia` in an `effect()`** — fine in a browser, breaks under SSR. ngkit already documents "no SSR guidance"; keep that honest by guarding it.
- **`CommandPaletteService.init()` adds a bare `window.addEventListener('keydown', …)` with no teardown.** Extracted form must register through `DestroyRef`.
- **Non-goal:** extracting `InventoryStore`. It looks generic ("signal store with audit journal") but every method encodes MFC inventory rules.
- **Non-goal:** a state-management library. ngkit deliberately ships none ([agent guide §8](../ngkit-agent-guide.md)); nothing in CIMS changes that.

---

# Implementation

Hand-off notes for the implementing agent:

- Follow the repo conventions in [CLAUDE.md](../../CLAUDE.md) and the API conventions in [docs/ngkit-agent-guide.md](../ngkit-agent-guide.md).
- Run tasks through Nx with pnpm: `pnpm nx test ng`, `pnpm nx lint ng`, `pnpm nx build ng`.
- Every new secondary entry point needs the six-part checklist in §I-0 — missing any one of them produces a library that builds locally but is broken when packed.
- Do **not** copy CIMS code verbatim. Every item below says what to generalise; the CIMS versions have domain types baked in.
- Order matters: **R1 → R2 → R3 → A-1…A-5 → Tier B**. A-3 and A-4 have no dependency on R1 and can run in parallel.

## I-0. Checklist for adding a secondary entry point (`@rn-forge/ng/<name>`)

Mirror `libs/ng/auth/` exactly (`libs/ng/http/` is removed by H2R):

1. `libs/ng/<name>/ng-package.json` → `{ "lib": { "entryFile": "src/index.ts" } }`
2. `libs/ng/<name>/src/index.ts` → `export * from './lib/<name>.…';`
3. `tsconfig.base.json#compilerOptions.paths` → `"@rn-forge/ng/<name>": ["./libs/ng/<name>/src/index.ts"]`
4. [libs/ng/project.json](../../libs/ng/project.json) → add to `targets.test.options.include` (`"../<name>/src/**/*.spec.ts"`) **and** `coverageInclude` (`"libs/ng/<name>/src/**"`). The 80% coverage thresholds are enforced.
5. `libs/ng/package.json` → add any new peer deps to **both** `devDependencies` and `peerDependencies` (they are kept in sync there).
6. Verify the packed output: `pnpm nx build ng && ls dist/libs/ng/<name>`.

For a **new library** (`ng-material`, `ng-charts`) additionally: `libs/<name>/package.json` with `description`/`license`/`repository`/`publishConfig.access: "public"`; `project.json` with the `release.version.manifestRootsToUpdate` pair documented in [CLAUDE.md](../../CLAUDE.md); `pack` + `nx-release-publish` (with `dryRun: true`) targets; a `compodoc` target; and a `docs/site` entry under `api/<name>/`.

> Note: `nx.json#release` currently only sets `preVersionCommand`. CLAUDE.md documents fixed/grouped versioning via `release.projects` / `projectsRelationship` — confirm the current state of `nx.json` before adding a new publishable project rather than assuming those keys exist.

---

## I-1. `CsvUtil` → `@rn-forge/ng/core`

**Source:** `cims/src/app/shared/utils/csv-utils.ts`
**Target:** `libs/ng/core/src/lib/core.utils.ts` (new exported class, alongside `AppUtil`/`ObjectUtil`/`DateUtil`/`FormUtil`)

**API:**

```ts
export interface CsvColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

export class CsvUtil {
  /** RFC-4180-ish: quotes fields containing comma/quote/newline; CRLF rows; header row first. */
  static toCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string;
  /** Serialises and triggers a browser download. Delegates the download to AppUtil.saveBlob. */
  static download(filename: string, columns: CsvColumn[], rows: Record<string, unknown>[]): void;
}
```

**Steps**

1. Port `toCsv` as-is (the escaping is correct — `/[",\r\n]/` test, `"` doubling, CRLF joins). Add the optional per-column `format` hook, applied before escaping.
2. **Do not** port `downloadCsv`'s anchor dance. Delegate to `AppUtil.saveBlob(blob, fileName)` in `core.utils.ts` (added with H2R in place of the removed `HttpUtil.downloadFile`); there is no `HttpUtil` re-export to keep.
3. Export from `libs/ng/core/src/index.ts` (already `export * from './lib/core.utils'` — nothing to add).

**Tests** (`libs/ng/core/src/lib/core.utils.spec.ts`, extend the existing file): header row emitted from `label`; field containing `,` is quoted; embedded `"` doubled; embedded newline quoted; `null`/`undefined` → empty string; rows joined with `\r\n`; `format` hook applied; `download` creates and revokes an object URL (spy on `URL.createObjectURL`/`revokeObjectURL`).

**Done when:** `pnpm nx test ng` passes with coverage still ≥80%, and `CsvUtil` is importable from `@rn-forge/ng/core`.

---

## I-2. `DateUtil.relative()` → `@rn-forge/ng/core`

**Source:** `cims/src/app/shared/utils/date-utils.ts` (`relTime`)
**Target:** `libs/ng/core/src/lib/core.utils.ts`, added to the existing `DateUtil` class.

**Steps**

1. Add `static relative(date: string | number | Date, now = Date.now()): string`. Inject `now` so tests don't need fake timers.
2. Keep CIMS's thresholds (`<60m` → `Nm ago`, `<24h` → `Nh ago`, `1d` → `Yesterday`, else `Nd ago`) but add the missing negative branch: CIMS's `Math.max(1, mins)` silently renders future dates as `1m ago`. Return `'just now'` for `|diff| < 60s` and an `in Nm`/`in Nh`/`Tomorrow`/`in Nd` family for future dates.
3. Note in the JSDoc that this is a deliberately dependency-free approximation — apps needing locale-correct output should use `Intl.RelativeTimeFormat` directly.

**Tests:** each boundary (59m/60m/23h/24h/25h/47h/48h), future dates, `Date`/epoch/ISO-string inputs.

---

## I-3. `@rn-forge/ng/data` — client-side collection query ★ highest value

**Source pattern:** `cims/src/app/features/inventory/items/catalog.ts` (chip counts, 4 filters, 3-way sort, 200 ms debounced search), `features/inventory/movements/movements.ts` (multi-select type chips, source filter, date window), `features/reports/audit/audit.ts`, `features/purchasing/{pricing,orders,replenishment}`.
**Target:** new entry point `libs/ng/data/` (follow §I-0).

**API sketch** — signal-in/signal-out, no UI, no Angular component:

```ts
export type SortDirection = 'asc' | 'desc';
export interface SortState<$T> {
  key: keyof $T & string;
  direction: SortDirection;
}

export interface CollectionQueryOptions<$T> {
  /** Source rows. Accept a Signal so it can be a store's computed(). */
  source: Signal<$T[]>;
  /** Fields scanned by the free-text search, or a custom extractor. */
  searchFields?: (keyof $T & string)[] | ((row: $T) => string[]);
  /** Debounce for setSearch(), ms. Default 200. */
  searchDebounceMs?: number;
  /** Named predicates; each is enabled by setFilter(name, value). */
  filters?: Record<string, (row: $T, value: unknown) => boolean>;
  /** Comparators for keys that aren't plain string/number (e.g. computed "days of cover"). */
  comparators?: Partial<Record<string, (a: $T, b: $T) => number>>;
  /** Stable tiebreak comparator applied after the active sort. */
  tiebreak?: (a: $T, b: $T) => number;
  initialSort?: SortState<$T>;
  pageSize?: number;
}

export interface CollectionQuery<$T> {
  readonly rawSearch: Signal<string>; // immediate — bind to the input's value
  readonly search: Signal<string>; // debounced — drives filtering
  readonly filters: Signal<Record<string, unknown>>;
  readonly sort: Signal<SortState<$T> | undefined>;
  readonly result: Signal<$T[]>; // filtered + sorted
  readonly page: Signal<$T[]>; // result windowed by pageSize/pageIndex
  readonly total: Signal<number>; // source.length
  readonly matched: Signal<number>; // result.length
  readonly pageIndex: Signal<number>;
  readonly pageCount: Signal<number>;
  /** Row counts per filter value, for chip/badge UIs. */
  counts(name: string, values: readonly unknown[]): Signal<Record<string, number>>;
  setSearch(value: string): void;
  setFilter(name: string, value: unknown): void;
  toggleSort(key: keyof $T & string): void; // asc → desc → asc
  clearFilters(): void;
  setPageIndex(index: number): void;
}

export function createCollectionQuery<$T>(options: CollectionQueryOptions<$T>): CollectionQuery<$T>;
```

**Steps**

1. Scaffold the entry point per §I-0.
2. Implement with `signal`/`computed` only. The debounce must clear its timer via `DestroyRef.onDestroy` — CIMS's `catalog.ts` leaks its `setTimeout` on destroy; do not reproduce that. `createCollectionQuery` therefore must be called in an injection context (assert with `assertInInjectionContext`), or accept an optional `injector`.
3. Filtering order: `filters` (all enabled predicates, AND) → search (OR across `searchFields`, case-insensitive, `toLocaleLowerCase`) → sort → page. Keep each stage its own `computed()` so a sort change doesn't re-run filtering.
4. Sorting: use `comparators[key]` if present, else `localeCompare` for strings and numeric subtraction for numbers; always apply `tiebreak` last so sorting is stable and deterministic. Handle non-finite numbers by sorting them last regardless of direction (CIMS's "days of cover = Infinity" case).
5. `counts()` returns a memoised `computed()` keyed on the filter name — used for CIMS's chip counters (`all/low/critical/out/inactive`).
6. Export a couple of ready-made predicate factories, since every screen re-writes them: `dateWindow(days, key)`, `oneOf(key)`, `equals(key)`, `includesAny(key)`.

**Tests** (target >90% here — it's the load-bearing piece): filter+search+sort composition; debounce timing with fake timers; timer cleared on destroy; stable sort via tiebreak; `Infinity`/`NaN` ordering; `counts()` correctness; pagination edges (`pageIndex` clamped when `result` shrinks); empty source.

**Docs:** a `## Collection query` section in the agent guide, plus a demo screen in `apps/ng-demo` that filters a list without `rnf-table` (this is the "I have data but not a jQuery table" story).

**Done when:** `catalog.ts`'s ~90 lines of filter/sort code can be expressed in ~15 lines against this API (validate by writing that snippet in the PR description — not by editing CIMS).

---

## I-4. `ColorModeService` → `@rn-forge/ng/core` (+ R3)

**Source:** `cims/src/app/core/theme.service.ts` (20 lines, `localStorage` + `documentElement.classList`)
**Target:** `libs/ng/core/src/lib/core.services.ts`

**API:**

```ts
export type ColorMode = 'light' | 'dark' | 'auto';

export interface ColorModeConfig {
  /** localStorage key, namespaced by LocalStorageService. Default 'colorMode'. */
  storageKey?: string;
  /** Attribute set on <html>, e.g. 'data-bs-theme' for Bootstrap. Default undefined. */
  attribute?: string;
  /** Class toggled on <html> when resolved dark, e.g. 'dark'. Default undefined. */
  darkClass?: string;
  /** Also set the CSS `color-scheme` property. Default true. */
  setColorScheme?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ColorModeService {
  readonly mode: Signal<ColorMode>; // as chosen
  readonly resolved: Signal<'light' | 'dark'>; // 'auto' resolved against prefers-color-scheme
  set(mode: ColorMode): void;
  toggle(): void; // light ↔ dark, leaves 'auto' by resolving first
}
export const provideRnForgeColorMode = (config?: ColorModeConfig) => EnvironmentProviders;
```

**Steps**

1. Persist via the existing `LocalStorageService` (already app-name namespaced) rather than raw `localStorage` — this is the improvement over CIMS's version.
2. Track `window.matchMedia('(prefers-color-scheme: dark)')` for `'auto'`; register the listener through `DestroyRef`.
3. Apply `attribute` and/or `darkClass` and `color-scheme` in a single `effect()`. Supporting **both** is what lets one service drive Bootstrap (`data-bs-theme`) and Material/CIMS (`.dark` + `color-scheme`).
4. Guard every `document`/`window` access so the service is inert outside a browser.
5. **R3:** rewrite `libs/ng-bootstrap/shell/src/lib/color-mode/color-mode.ts` to inject `ColorModeService` and make `UserSettingsService` an `inject(UserSettingsService, { optional: true })` mirror. `StyleHelper.setColorMode` becomes a thin adapter or is removed. Keep the component's public API (`mode` input, config key `colorMode`) byte-identical — its Storybook stories and `color-mode.stories.ts` must pass unchanged.

**Tests:** persistence round-trip through `LocalStorageService`; `'auto'` follows a mocked `matchMedia`; attribute _and_ class applied; toggle from `'auto'`; no `document` access when `document` is unavailable. Plus: existing ng-bootstrap color-mode tests still green after R3.

---

## I-5. `@rn-forge/ng-charts` — ECharts autosize + theming

**Source:** `cims/src/app/shared/charts.ts` (`ChartAutosize`), `cims/src/app/core/chart-theme.ts` (`ChartTheme`)
**Target:** new library `libs/ng-charts/` (only if decision #2 says "separate package").

The `ChartAutosize` directive is the valuable half: it works around a real `ngx-echarts` defect (echarts initialises at 0px when the container isn't laid out, and ngx-echarts's own `ResizeObserver` ignores the first callback → blank canvas). That workaround is worth owning centrally. `app.config.ts`'s `provideEchartsCore` wrapper (patching `init` to pass a 1×1 placeholder size) is the other half of the same fix and should ship as `provideRnForgeEcharts()`.

**Steps**

1. Scaffold `libs/ng-charts` (`pnpm nx g @nx/angular:library ng-charts --directory=libs/ng-charts --buildable`), then bring it in line with the ng/ng-bootstrap `project.json` shape (release manifest roots, `pack`, `nx-release-publish` with `dryRun: true`, `compodoc`).
2. Peers: `echarts`, `ngx-echarts`, `@angular/core`, `@rn-forge/ng` (for `ColorModeService`).
3. Port `ChartAutosize` verbatim — it is already correct (destroy-safe, disposal-checked, width-guarded).
4. Port `provideRnForgeEcharts()` from CIMS's `app.config.ts` `provideEchartsCore` block.
5. Generalise `ChartTheme`: CIMS hardcodes hex values in TS. Instead read from CSS custom properties (`getComputedStyle(document.documentElement).getPropertyValue('--…')`) with the hardcoded values as fallbacks, and recompute on `ColorModeService.resolved()`. That makes it work for both Bootstrap and Material token sets. Keep `colors` / `axisDefaults` / `tooltipDefaults` as the public shape.
6. Storybook stories for a line + bar chart in both color modes.

**Done when:** a chart in `apps/ng-demo` renders correctly when its container starts at 0 px (deferred/tab-hidden), and re-themes on color-mode toggle without a page reload.

---

## I-6. `@rn-forge/ng/reporting` — deferred, spec only

**Recommendation: do not build yet.** Write the interface down, revisit when a second app needs it.

`cims/src/app/features/reports/report-view/report-view.ts` contains a genuinely good declarative report engine: a `Record<string, ReportDef>` registry where each def carries `{ id, title, description, icon, filters, columns: ReportColumn[], rows: (ctx, filters) => Record<string, unknown>[], totals?: (rows) => TotalValue[] }`, with `ReportColumn.format` ∈ `currency|number|date|percent` and CSV export off the same column defs.

If/when it is extracted, the shape to aim for:

```ts
export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: ReportFormat | ((v: unknown) => string);
}
export interface ReportDef<$Ctx, $F> {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  filters?: (keyof $F & string)[];
  columns: ReportColumn[];
  rows: (ctx: $Ctx, filters: $F) => Record<string, unknown>[];
  totals?: (rows: Record<string, unknown>[]) => { label: string; value: number; format?: ReportFormat }[];
}
export class ReportRegistry<$Ctx, $F> {
  register(def): void;
  get(id): ReportDef;
  list(): ReportDef[];
}
export function runReport<$Ctx, $F>(def, ctx, filters): { rows; totals };
export function reportToCsv(def, rows): string; // reuses CsvUtil (I-1)
```

The `$Ctx` generic is what keeps `InventoryStore` out of the library. The rendering (table + filter bar + export button) stays app- or UI-package-side.

---

## I-7. `AuditTrailService` → `@rn-forge/ng/core` (optional, low priority)

**Source:** `InventoryStore.log()` / `pushTxn()` in `cims/src/app/core/state/inventory-store.ts`.

A tiny signal-backed journal: `record({ action, entity, entityId, before?, after? })` stamping `id`/`timestamp`/`user`, exposed as `entries: Signal<AuditEntry[]>` newest-first, with a pluggable id generator, clock, and current-user resolver, and an optional sink callback for shipping entries to a backend. Genuinely reusable, but ~60 lines — extract only if a second app wants it, or bundle it into the same PR as I-1/I-2 since it's cheap.

---

## I-8. `CommandRegistry` (headless half of the command palette)

**Source:** the `navResults`/`actionResults`/`itemResults`/`onKeydown` logic in `cims/src/app/shared/command-palette.ts`.
**Target:** `libs/ng/core/src/lib/core.services.ts` (or `@rn-forge/ng/data` if it lands first).

```ts
export interface Command {
  id: string;
  label: string;
  icon?: string;
  group?: string;
  keywords?: string;
  run: () => void;
  enabled?: () => boolean;
}
@Injectable({ providedIn: 'root' })
export class CommandRegistry {
  register(...commands: Command[]): void;
  unregister(...ids: string[]): void;
  readonly groups: Signal<{ group: string; commands: Command[] }[]>;
  match(query: string): Signal<{ group: string; commands: Command[] }[]>;
  /** Flat index for arrow-key navigation across groups. */
  flat(query: string): Signal<Command[]>;
}
```

The renderer (dialog, input, group headers, arrow-key handling) is Tier B. **The keyboard shortcut registration must be `DestroyRef`-scoped** — CIMS's `CommandPaletteService.init()` attaches a permanent `window` listener with no removal.

---

## I-9. Tier B — `@rn-forge/ng-material` (gated on decision #1)

Only start after **R1** has landed. Scaffold to mirror `libs/ng-bootstrap/`:

```
libs/ng-material/
  package.json          @rn-forge/ng-material — description, license, repository,
                        publishConfig.access: public; peers: @angular/material,
                        @angular/cdk, @rn-forge/ng
  ng-package.json       dest ../../dist/libs/ng-material
  project.json          build/pack/test/lint/compodoc + release.version.manifestRootsToUpdate pair
  .storybook/
  src/index.ts          page-header, breadcrumb, empty-state, skeleton, kpi-card,
                        status-chip, gauge, command-palette
  shell/                side-nav, topbar
  assets/               _tokens.scss, _theme.scss
```

Per-component generalisation rules (do not skip these — they are what turns app code into library code):

| Component             | Must change from the CIMS version                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rnm-status-chip`     | Replace `StockStatus` with `'neutral'\|'success'\|'warning'\|'danger'\|'info'`; take `label` as required input, drop the built-in `LABELS` map.                                                   |
| `rnm-gauge`           | Drop the `stockStatus()` import. Inputs: `value`, `min`, `max`, `unit`, `thresholds?: {warning: number; danger: number}`, `tone?: Signal<Tone>`. Keep the 220° arc maths verbatim — it's correct. |
| `rnm-kpi-card`        | Keep the count-up, but gate `matchMedia` behind a browser check and expose `animate = input(true)`. Generalise `KpiTone` off the inventory palette.                                               |
| `rnm-breadcrumb`      | Rebuild reactively from the router (`computed()` over `router.events` / `toSignal`), not a constructor-time snapshot. Add an explicit `items` input override.                                     |
| `rnm-side-nav`        | `groups` and `home` become inputs; the `badges` computed becomes a `badgeResolver` input `(groupId: string) => number`. Keep every ARIA attribute — it's the most accessible thing in the app.    |
| `rnm-skeleton`        | Move `@keyframes app-shimmer` from the global stylesheet into the component's own styles so it works without the token sheet.                                                                     |
| `rnm-command-palette` | Consume `CommandRegistry` (I-8); the component owns only the dialog + input + arrow-key wiring.                                                                                                   |
| tokens SCSS           | Rename `--sp-*` etc. to a namespaced prefix (`--rnf-sp-*`) with the unprefixed names kept as aliases, so importing the sheet can't collide with an app's own tokens.                              |

Each component: a Storybook story (light + dark), a spec covering inputs and a11y attributes, and a demo usage. Then add `api/ng-material/` to the Pages assembly described in [CLAUDE.md](../../CLAUDE.md#docs-site) and a row to the projects table in [README.md](../../README.md).

---

## I-10. Sequencing and estimates

| Step | Items                                              | Depends on                                            | Rough effort |
| ---- | -------------------------------------------------- | ----------------------------------------------------- | ------------ |
| 1    | R2 (id generics)                                   | —                                                     | 0.5 day      |
| 2    | I-1 CsvUtil, I-2 DateUtil.relative, I-7 AuditTrail | —                                                     | 1 day        |
| 3    | I-4 ColorModeService + R3                          | I-1's `downloadFile` move (unrelated, can interleave) | 1 day        |
| 4    | I-3 `@rn-forge/ng/data`                            | —                                                     | 2–3 days     |
| 5    | R1 (lift ConfigurableComponent)                    | —                                                     | 1–2 days     |
| 6    | I-5 `@rn-forge/ng-charts`                          | I-4                                                   | 2 days       |
| 7    | I-8 CommandRegistry                                | —                                                     | 0.5 day      |
| 8    | I-9 `@rn-forge/ng-material`                        | R1, I-8                                               | 5–8 days     |
| 9    | I-6 reporting                                      | I-1                                                   | deferred     |

Steps 1–4 are the ones that unblock [Plan 2](cims-adoption-plan.md) Phases 1–4. Steps 5 and 8 are the Tier B commitment.
