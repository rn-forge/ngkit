# E12 — On-demand features

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** the row's trigger occurs.

**Source:** former roadmap item H2R.5 (F12.1, F12.11) and a 2026-09 survey of an existing Angular Material application (F12.2–F12.10).

Proposals that wait for a trigger. When it fires, the row becomes a feature with stories and acceptance before any code. Rows F12.2–F12.10 come from a 2026-09 survey of an existing Angular Material application, treated as prior art (ADR-0001): what it hand-rolled that ngkit could supply.

[Back to the board](../../index.md)

| ID                                                            | Proposal                                                                 | Trigger                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [F12.1](#f121--telemetry-entry-point)                         | Optional `@rn-forge/ng/telemetry` entry point                            | Two apps need the same OpenTelemetry setup                                    |
| [F12.2](#f122--csvutil)                                       | `CsvUtil` in `ng/core`                                                   | The owner schedules it                                                        |
| [F12.3](#f123--dateutilrelative)                              | `DateUtil.relative()`                                                    | The owner schedules it                                                        |
| [F12.4](#f124--client-side-collection-query)                  | `@rn-forge/ng/data`: client-side collection query                        | The owner schedules it                                                        |
| [F12.5](#f125--rn-forgeng-charts)                             | `@rn-forge/ng-charts` package                                            | The owner schedules it                                                        |
| [F12.6](#f126--headless-report-definitions)                   | `@rn-forge/ng/reporting`: headless report definitions                    | A second app needs report definitions                                         |
| [F12.7](#f127--audittrailservice)                             | `AuditTrailService`                                                      | The owner schedules it                                                        |
| [F12.8](#f128--commandregistry)                               | `CommandRegistry`: a headless command palette                            | The owner schedules it                                                        |
| [F12.9](#f129--configurablecomponent-into-ngcore)             | Move `ConfigurableComponent` and `ConfigurerService` into `ng/core`      | A second presentation package is scheduled (E8 or F12.10)                     |
| [F12.10](#f1210--rn-forgeng-material)                         | `@rn-forge/ng-material`                                                  | The owner decides a Material kit is in scope                                  |
| [F12.11](#f1211--adapter-package-for-another-wire-convention) | A separately named adapter package for another published wire convention | Several backends share a published, versioned convention other than AIP + RFC |

Adding an entry point under `@rn-forge/ng/<name>` follows [Adding a secondary entry point](../../../guides/development.md#adding-a-secondary-entry-point). Adding a library follows [Adding a publishable library](../../../guides/development.md#adding-a-publishable-library).

Rows F12.2–F12.8 are headless: they have no UI-framework coupling, so they fit the existing `ng` library and are usable from Bootstrap and Material apps alike. The recommendation is to do them first, and to treat the Material kit (F12.10) as a separate, explicitly funded decision.

## F12.1 — Telemetry entry point

An optional `@rn-forge/ng/telemetry` entry point: `provideRnForgeTelemetry({ serviceName, exporterUrl, propagateTo, transport })`, plus the `OPERATION` token and a reporting interceptor. It is built once two apps need the same OpenTelemetry setup, which [the HTTP guide](../../../guides/http.md#telemetry-versions-checked-2026-09-22) describes today. It wraps a standard rather than re-implementing `HttpClient` ([ADR-0004](../../../adr/ADR-0004.md)). The OpenTelemetry packages stay optional peers, so consumers that don't use telemetry don't install them.

## F12.2 — `CsvUtil`

The survey found that every list screen exports CSV, and that ngkit has a blob download (`AppUtil.saveBlob`) but no CSV serializer. Add `CsvUtil` to `libs/ng/core/src/lib/core.utils.ts`, beside `AppUtil`, `ObjectUtil`, `DateUtil` and `FormUtil`.

```ts
export interface CsvColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

export class CsvUtil {
  /** RFC 4180-style: quotes fields containing comma, quote or newline; CRLF rows; header row first. */
  static toCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string;
  /** Serialises and triggers a browser download, delegating the download to AppUtil.saveBlob. */
  static download(filename: string, columns: CsvColumn[], rows: Record<string, unknown>[]): void;
}
```

Requirements:

- Quote a field that matches `/[",\r\n]/`, double embedded quotes, and join rows with CRLF.
- Apply the optional per-column `format` hook before escaping.
- `download` delegates to `AppUtil.saveBlob(blob, fileName)`; it does not create its own anchor element.
- `core.utils.ts` is already exported from the entry point, so nothing else needs exporting.

Tests, extending `core.utils.spec.ts`: the header row comes from `label`; a field containing `,` is quoted; an embedded `"` is doubled; an embedded newline is quoted; `null` and `undefined` become an empty string; rows are joined with `\r\n`; `format` is applied; `download` creates and revokes an object URL. Done when `pnpm nx test ng` passes with coverage still at or above 80%, and `CsvUtil` is importable from `@rn-forge/ng/core`.

## F12.3 — `DateUtil.relative()`

The survey found a relative-time helper that belongs on the existing `DateUtil` as one method. Add `static relative(date: string | number | Date, now = Date.now()): string` to `DateUtil`. Inject `now` so tests need no fake timers.

- Thresholds: under 60 minutes gives `Nm ago`; under 24 hours gives `Nh ago`; one day gives `Yesterday`; otherwise `Nd ago`.
- The surveyed helper clamped the minute count to at least 1, which renders a future date as `1m ago`. Handle it properly: return `just now` when the difference is under 60 seconds, and an `in Nm`, `in Nh`, `Tomorrow`, `in Nd` family for future dates.
- The doc comment says this is a deliberately dependency-free approximation; applications that need locale-correct output use `Intl.RelativeTimeFormat` directly.

Tests: each boundary (59m, 60m, 23h, 24h, 25h, 47h, 48h), future dates, and `Date`, epoch and ISO-string inputs.

## F12.4 — Client-side collection query

The survey found six list screens re-implementing filter, search, multi-key sort and debounce as `computed()` chains, about 600 lines of near-duplicate code, and ngkit has no equivalent for applications that don't use the jQuery-based `rnf-table`. The screens combined chip counts, multi-select type chips, a source filter, a date window, up to four filters, a three-way sort and a 200 ms debounced search. This is the highest-value row. Add a new entry point, `@rn-forge/ng/data`, holding a signal-in, signal-out query with no UI and no component, plus the pagination and sort and filter primitives it is built from.

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
  /** Comparators for keys that aren't plain string/number (for example a computed value). */
  comparators?: Partial<Record<string, (a: $T, b: $T) => number>>;
  /** Stable tiebreak comparator applied after the active sort. */
  tiebreak?: (a: $T, b: $T) => number;
  /** One entry or several; earlier entries sort first. */
  initialSort?: SortState<$T> | readonly SortState<$T>[];
  pageSize?: number;
}

export interface CollectionQuery<$T> {
  readonly rawSearch: Signal<string>; // immediate: bind to the input's value
  readonly search: Signal<string>; // debounced: drives filtering
  readonly filters: Signal<Record<string, unknown>>;
  readonly sort: Signal<readonly SortState<$T>[]>; // empty: source order
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
  toggleSort(key: keyof $T & string, options?: SortToggleOptions): void; // toggleSortState on `sort`
  clearFilters(): void;
  setPageIndex(index: number): void;
}

export function createCollectionQuery<$T>(options: CollectionQueryOptions<$T>): CollectionQuery<$T>;
```

Requirements:

1. Implement with `signal` and `computed` only.
2. The debounce clears its timer through `DestroyRef.onDestroy`; the surveyed screens leaked their `setTimeout` on destroy. `createCollectionQuery` therefore runs in an injection context (assert with `assertInInjectionContext`) or accepts an optional `injector`.
3. Order of stages: `filters` (all enabled predicates, AND), then search (OR across `searchFields`, case-insensitive through `toLocaleLowerCase`), then sort, then page. Each stage is its own `computed()`, so a sort change doesn't re-run filtering.
4. Sorting applies each `sort` entry in order, the next entry breaking ties of the one before. Each uses `comparators[key]` if present, else `localeCompare` for strings and numeric subtraction for numbers. `tiebreak` is always applied last, so sorting is stable and deterministic. Non-finite numbers sort last regardless of direction (the survey found a computed ratio that can be infinite, which needed this).
5. `counts()` returns a memoized `computed()` keyed on the filter name, used for chip counters.
6. Ship ready-made predicate factories, since every screen re-writes them: `dateWindow(days, key)`, `oneOf(key)`, `equals(key)` and `includesAny(key)`.

Tests, targeting above 90% coverage because this is the load-bearing piece: filter, search and sort composed; debounce timing with fake timers; timer cleared on destroy; stable sort through `tiebreak`; `Infinity` and `NaN` ordering; `counts()` correctness; pagination edges (`pageIndex` clamped when `result` shrinks); an empty source.

Docs: a "Collection query" section in the app-building guide, and a demo screen in `apps/ng-demo` that filters a list without `rnf-table` (the "I have data but not a jQuery table" story). Done when a screen's roughly 90 lines of filter and sort code can be expressed in about 15 lines against this API, shown as a snippet in the PR description.

### Sort state and range selection

A keyboard-first application with a virtualized grid, which sorts on the server and keeps its sort in the URL, hand-rolls two more generic primitives that this entry point should own, so they are not tied to `createCollectionQuery`. Both are pure, immutable and carry no query language.

```ts
// Sort state: one type for single- and multi-key sorting, client or server side.
export interface SortToggleOptions {
  /** Append or flip in place instead of replacing the sort. Default false. */
  readonly additive?: boolean;
  /** `tri`: asc → desc → unsorted (default); `bi`: asc → desc → asc. */
  readonly cycle?: 'tri' | 'bi';
}
export function toggleSortState<$K extends string>(sorts: readonly SortState<Record<$K, unknown>>[], key: $K, options?: SortToggleOptions): SortState<Record<$K, unknown>>[];
export function sortDirection(sorts: readonly SortState<object>[], key: string): SortDirection | null;
export function ariaSort(sorts: readonly SortState<object>[], key: string): 'ascending' | 'descending' | 'none';

// Range selection: the range modifier extends from the anchor, the toggle modifier flips one row.
export interface RangeSelection<$K> {
  readonly selected: ReadonlySet<$K>;
  readonly anchor: number | null;
}
export function rangeSelect<$T, $K>(selection: RangeSelection<$K>, items: readonly $T[], keyOf: (item: $T) => $K, index: number, modifiers: { readonly toggle: boolean; readonly range: boolean }): RangeSelection<$K>;
```

Requirements:

7. `toggleSortState`: a key not in `sorts` becomes `asc`. A key in `sorts` at `asc` becomes `desc`. At `desc`, `cycle: 'tri'` removes it and `cycle: 'bi'` makes it `asc`. Without `additive` the result holds only that key (or nothing, when it was removed); with `additive` an absent key is appended and a present one changes in place, order kept. The default cycle is `tri` so that a table can return to its natural order; `aria-sort="none"` is the ARIA state for it. It builds no query string: a server-sorted table formats the array itself.
8. `ariaSort` returns the WAI-ARIA `aria-sort` value for a header. `CollectionQuery.toggleSort` is `toggleSortState` applied to its `sort` signal.
9. `rangeSelect`: with `range` and an anchor, adds every item between the anchor and `index` inclusive to a new set and keeps the anchor; with `toggle`, flips one key and sets the anchor to `index`; with neither, returns the selection unchanged (the caller owns a plain click). Out-of-range indexes are ignored. It indexes `items`, not DOM rows, so it works under virtual scrolling.
10. Tests: `toggleSortState` on a new, `asc` and `desc` key in both cycles, with and without `additive`, order kept; `ariaSort` for each state; `rangeSelect` forward and backward ranges, the anchor kept, toggle on and off, no modifier, empty items, and no mutation of the input set; a `CollectionQuery` with two sort entries applies the second as the tiebreak of the first.

### Not added

- **URL query parameter signals.** ngxtension's `linkedQueryParam` is a maintained writable signal over a query parameter, with parse and stringify, merged and batched navigation ([ADR-0001](../../../adr/ADR-0001.md) principle 1). It is one call already, so a wrapper would standardize nothing. The app-building guide shows it when this row is built; ngkit takes no dependency on it.
- **Persisted column layout.** The only consumer keeps a layout bound to its own column catalogue. Reconsider when a second application persists a column layout; it would build on `LocalStorageService.tryGetJSON` and `trySetJSON`, normalize against a catalogue, and include show and hide as well as move and reset.

## F12.5 — `@rn-forge/ng-charts`

The survey found two pieces of chart plumbing worth owning centrally, filling a gap the app-building guide documents. A separate package is proposed because an entry point in `@rn-forge/ng` would put `echarts` and `ngx-echarts` into `ng`'s peer dependencies for every consumer.

- **`ChartAutosize` directive.** It works around a real `ngx-echarts` defect: echarts initializes at 0 px when its container isn't laid out yet, and `ngx-echarts`'s own `ResizeObserver` ignores the first callback, leaving a blank canvas. The directive must be destroy-safe, check for disposal and guard on width.
- **`provideRnForgeEcharts()`.** The other half of the same fix: it wraps the echarts core provider and patches `init` to pass a 1×1 placeholder size.
- **`ChartThemeService`.** The survey's theme service hardcoded hex values in TypeScript. Instead, read colors from CSS custom properties (`getComputedStyle(document.documentElement).getPropertyValue('--…')`), with hardcoded values as fallbacks, and recompute when the resolved color mode changes ([E7](../E7-theme-controller/index.md)). That works for both Bootstrap and Material token sets. The public shape is `colors`, `axisDefaults` and `tooltipDefaults`.

Package: peers are `echarts`, `ngx-echarts`, `@angular/core` and `@rn-forge/ng` (for the color-mode service). Its `project.json` follows the `ng` and `ng-bootstrap` shape (release manifest roots, `pack`, `nx-release-publish` with `dryRun: true`, `compodoc`); see [Adding a publishable library](../../../guides/development.md#adding-a-publishable-library). Add Storybook stories for a line and a bar chart in both color modes. Done when a chart in `apps/ng-demo` renders correctly when its container starts at 0 px (deferred or in a hidden tab) and re-themes on a color-mode toggle without a reload.

**Depends on:** [E7](../E7-theme-controller/index.md).

### Open questions

- Separate package or optional entry point? The plan above assumes a separate package, to keep `echarts` out of `ng`'s peers.

## F12.6 — Headless report definitions

Trigger: a second app needs report definitions. Recommendation: don't build it before then; the interface is written down here.

The survey found a declarative report engine: a registry of report definitions, each carrying an id, title, description, icon, filters, columns, a row builder, optional totals and formats (`currency`, `number`, `date`, `percent`), with CSV export driven by the same column definitions. It was the largest single extraction candidate. The shape to aim for, in a new `@rn-forge/ng/reporting` entry point:

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
export function reportToCsv(def, rows): string; // reuses CsvUtil (F12.2)
```

The `$Ctx` generic is what keeps an application's store out of the library. Rendering (table, filter bar, export button) stays with the app or a presentation package. Depends on F12.2.

### Open questions

- Extract now or park until a second app needs it? The recommendation is to park it.

## F12.7 — `AuditTrailService`

The survey found an audit-journal pattern in an application store. It is genuinely reusable but small (about 60 lines); extract it only if a second app wants it, or bundle it with F12.2 and F12.3 because it is cheap.

Only the journal pattern is extracted. The store it came from is a non-goal: it looks generic (a signal store with an audit journal), but every method encodes one application's domain rules.

A signal-backed journal in `@rn-forge/ng/core`: `record({ action, entity, entityId, before?, after? })` stamps `id`, `timestamp` and `user`, and exposes `entries: Signal<AuditEntry[]>` newest first. It takes a pluggable id generator, clock and current-user resolver, and an optional sink callback for shipping entries to a backend.

## F12.8 — `CommandRegistry`

The survey found a command palette whose matching and ranking logic (navigation results, action results, item results and arrow-key handling) is headless in nature. Add the headless half to `@rn-forge/ng/core` (or `@rn-forge/ng/data` if F12.4 lands first); the dialog renderer belongs to a presentation package (F12.10).

```ts
export interface Command {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly hint?: string;
  readonly icon?: string;
  readonly keywords?: readonly string[];
  /** Key binding in the shortcut library's syntax, for example `'$mod+k'` (`meta` on macOS, `ctrl` elsewhere). */
  readonly shortcut?: string;
  /** Fire the shortcut while focus is in an editable element. Default false. */
  readonly allowInEditable?: boolean;
  readonly enabled?: () => boolean;
  run(): void;
}
export interface CommandGroup {
  readonly group: string;
  readonly commands: readonly Command[];
}
@Injectable({ providedIn: 'root' })
export class CommandRegistry {
  readonly commands: Signal<readonly Command[]>;
  readonly groups: Signal<readonly CommandGroup[]>;
  /** Returns an unregister function; with `destroyRef`, also unregisters on destroy. */
  register(commands: readonly Command[], destroyRef?: DestroyRef): () => void;
  /** Runs an enabled command; false when the id is unknown or disabled. */
  run(id: string): boolean;
  match(query: Signal<string>): Signal<readonly CommandGroup[]>;
  /** Flat order of `match(query)`, for arrow-key navigation across groups. */
  flat(query: Signal<string>): Signal<readonly Command[]>;
}
```

The surveyed palette attached a permanent `window` keydown listener with no removal; shortcut registration is scoped through `DestroyRef` instead.

### Consumer ready

A concrete consumer now exists, so the row's work is no longer speculative. A keyboard-first desktop-style application has a command palette opened with `⌘K`: its destinations come from the same model its sidebar renders, so the two cannot drift; pages register contextual actions that appear in an Actions group while the page is open and disappear when it is left; and pages register keyboard shortcuts the same way. The shape above is the one it builds against.

**Consumer ready; recommend scheduling.** The entry criterion is the owner scheduling the row, so this does not change F12.8's status, and no code starts before the owner schedules it and the row becomes a feature with stories and acceptance ([E12](index.md)). When it does:

- **Scoped registration.** A page passes its `DestroyRef` to `register`, so its commands and shortcuts never outlive it; a duplicate `id` replaces the earlier entry until that one's unregister runs.
- **Shortcuts.** Key-binding parsing comes from a maintained library rather than a hand-rolled parser ([ADR-0001](../../../adr/ADR-0001.md) principle 1); `tinykeys` is the candidate to check. One registry-owned listener is attached through `DestroyRef` and dispatches by `shortcut`, ignoring events from editable targets unless `allowInEditable` is set. Adding the dependency is decided when the row is scheduled.
- **Matching.** Case-insensitive: label prefix, then label substring, then `keywords`; disabled commands are left out, with `enabled()` read at match time. Fuzzy matching is not part of the first version.
- **Split of work.** The registry is headless and lives in `@rn-forge/ng/core`; the palette dialog, input and arrow-key wiring is a presentation component in `@rn-forge/ng-tailwind` ([E8](../E8-tailwind-package/index.md)), built on `@angular/cdk/dialog` and `@angular/aria`'s combobox and listbox, or in F12.10 for a Material kit.

## F12.9 — `ConfigurableComponent` into `ng/core`

Today `libs/ng-bootstrap/src/lib/bootstrap.component.ts` owns `ConfigOptions`, `Configurable`, `ConfigurerService` and `ConfigurableComponent`: the four-layer options resolution (`defaultOptions()`, then app config, then the `[options]` input, then runtime overrides) that every ngkit component is built on. Nothing in it is Bootstrap-specific except the config token it injects (`RN_FORGE_BOOTSTRAP_CONFIG_TOKEN`) and `StyleHelper`. See [configuration](../../../architecture/configuration.md).

Move the machinery to `@rn-forge/ng/core` against a renamed, UI-neutral token (`RN_FORGE_UI_CONFIG_PARTS` and `RN_FORGE_UI_CONFIG_TOKEN`). Leave `StyleHelper` and the vendor-script `provideAppInitializer` in `ng-bootstrap`, and re-export the moved symbols from `@rn-forge/ng-bootstrap`, so no consumer import changes.

Without this move, a second presentation package ([E8](../E8-tailwind-package/index.md) or F12.10) either duplicates the machinery or depends on `@rn-forge/ng-bootstrap`, and so on jQuery and Bootstrap CSS. Both are unacceptable ([ADR-0002](../../../adr/ADR-0002.md)). The move is worth doing whether or not a Material kit is ever built.

## F12.10 — `@rn-forge/ng-material`

Trigger: the owner decides a Material kit is in scope. Depends on F12.9 and F12.8.

The survey found components that neither ngkit nor `ng-bootstrap` supplies, implemented with Material. A sibling presentation library is the honest home for them, and it must not depend on `@rn-forge/ng-bootstrap`.

### Why a Bootstrap kit doesn't fit a Material app

Adopting `@rn-forge/ng-bootstrap` in a Material application means loading a second CSS framework and jQuery beside Angular Material:

- Two CSS frameworks are loaded at once, and Bootstrap's Reboot resets Material's typography.
- `provideRnForgeBootstrapConfig` loads jQuery and `bootstrap-table` globally regardless.
- `ng-bootstrap` has no equivalents for a page header, breadcrumb, empty state, skeleton, KPI card, status chip, gauge or grouped side nav.

Re-platforming the application onto Bootstrap would discard its design system for no functional gain, and a hybrid of the two is the worst of both.

### Components

| Component                             | Notes                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rnm-page-header`                     | Title, subtitle and projected actions. Trivial; `ng-bootstrap` should get one too.                                                                                                                                                                                                                    |
| `rnm-breadcrumb`                      | Rebuild reactively from the router (`computed()` over `router.events` or `toSignal`), with an explicit `items` input override. See the pitfalls below.                                                                                                                                                |
| `rnm-empty-state`                     | Icon ring, title, message and a projected call to action.                                                                                                                                                                                                                                             |
| `rnm-skeleton`                        | Pure CSS shimmer. Its `@keyframes` live in the component's own styles, so it works without the token sheet.                                                                                                                                                                                           |
| `rnm-kpi-card`                        | Includes an animated count-up that honors `prefers-reduced-motion`. Keep the count-up, gate `matchMedia` behind a browser check, expose `animate = input(true)`, and give `tone` semantic names.                                                                                                      |
| `rnm-status-chip`                     | `status` is `'neutral' \| 'success' \| 'warning' \| 'danger' \| 'info'`; `label` is a required input, with no built-in label map, and no domain type is imported.                                                                                                                                     |
| `rnm-gauge`                           | SVG arc gauge. Inputs: `value`, `min`, `max`, `unit`, `thresholds?: { warning: number; danger: number }` and `tone?: Signal<Tone>`. Keep the 220 degree arc maths as it is; it is correct.                                                                                                            |
| `rnm-side-nav`                        | Grouped, collapsible and badged; it auto-expands the active group and carries full accessibility (`aria-expanded`, `aria-controls`, `aria-current`). `groups` and `home` are inputs, and the badge count comes from a `badgeResolver` input `(groupId: string) => number`. Keep every ARIA attribute. |
| `rnm-command-palette`                 | A ⌘K palette: a Material dialog renderer over `CommandRegistry` (F12.8); the component owns only the dialog, the input and the arrow-key wiring.                                                                                                                                                      |
| `@rn-forge/ng-material/assets/tokens` | A design-token stylesheet: spacing, radius, status, surface and shadow tokens, a card class, entrance animations and shimmer keyframes. Use a namespaced prefix (`--rnf-sp-*`) with the unprefixed names kept as aliases, so importing the sheet can't collide with an application's own tokens.      |

Components stay free of domain types: anything the survey found tied to one application's domain takes a tone, label or resolver as input instead.

### Package layout

The scaffold mirrors `libs/ng-bootstrap/`'s entry-point layout. The color-mode toggle in `shell/` is built on the [E7](../E7-theme-controller/index.md) service, so it depends on E7.

```text
libs/ng-material/
  package.json          @rn-forge/ng-material: description, license, repository,
                        publishConfig.access: public; peers: @angular/material,
                        @angular/cdk, @rn-forge/ng
  ng-package.json       dest ../../dist/libs/ng-material
  project.json          build/pack/test/lint/compodoc + release.version.manifestRootsToUpdate pair
  .storybook/
  src/index.ts          page-header, breadcrumb, empty-state, skeleton, kpi-card,
                        status-chip, gauge, command-palette
  shell/                side-nav, topbar, color-mode toggle
  assets/               _tokens.scss, _theme.scss
```

Each component gets a Storybook story (light and dark), a spec covering inputs and accessibility attributes, and a demo usage. Then add an `api/ng-material/` entry to the docs site and a row to the projects table in the README; the full checklist is in [Adding a publishable library](../../../guides/development.md#adding-a-publishable-library).

### Pitfalls the survey found

- **Breadcrumb snapshots the route once.** The surveyed breadcrumb read the route's `data` in a field initializer, so it was stale on same-component navigations (for example `/orders/:id` to another id). Fix it in the design; don't port it.
- **`matchMedia` under SSR.** A count-up that calls `matchMedia` in an `effect()` works in a browser and breaks under SSR. ngkit documents no SSR guidance; keep that honest by guarding it.
- **A keydown listener with no teardown.** A palette service that adds a bare `window` keydown listener leaks. Register through `DestroyRef`.
- **Two UI packages is a real maintenance cost.** `ng-bootstrap` has Storybook, Compodoc, release wiring and a demo app, and a Material sibling needs all four or it rots. This is the main reason this is a separate decision.
- **No state library.** ngkit deliberately ships none; nothing in the survey changes that.

### Open questions

- Is a Material kit in scope at all? If not, F12.10 is dropped, and the surveyed application keeps its own components; that is a defensible answer.
- [E8](../E8-tailwind-package/index.md) and F12.10 each add a second presentation package. Decide whether both are wanted.

## F12.11 — Adapter package for another wire convention

Trigger: several backends share a published, versioned convention other than AIP + RFC.

A generic CRUD client does not belong in `ng`. A generic `RestResource<T>` encodes a backend convention (list envelope, id type, `PUT` versus `PATCH`, nested routes), which is the same adapter dialect that was removed with `http/crud`. Prefer generated clients; otherwise an app may keep a roughly 15-line generic base of its own that implements the screen's data-source contract ([resource screen](../../../architecture/resource-screen.md)). Only a published, versioned convention shared by several backends would justify a separately named adapter package.

The CRUD screen's interface is a different thing and does belong in ngkit. AIP + RFC is a published convention, so the dialect objection does not apply to it: `@rn-forge/ng/crud` ships `standardDataSource()` for it ([ADR-0005](../../../adr/ADR-0005.md)). Other conventions still adapt in the app.
