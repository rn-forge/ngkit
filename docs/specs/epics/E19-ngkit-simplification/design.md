# ngkit simplification — review and proposed design

This proposal covers the existing libraries, representative tests, demo/fixture
applications, packaging helpers and documentation. Features settle their own
implementation; F19.3 establishes behavioral and measurement baselines before
refactoring. Findings are static source observations at `0035837`, reviewed on
2026-11-14, not executed defect reproductions, an exhaustive security audit or
measured speedups. Source locations below identify the reviewed code and may
move during implementation.

The review asks whether tests survive implementation changes, facts have one
owner, resources have explicit lifetimes, adapters translate rather than own
policy, and work records retain only durable information. Existing ADRs remain
binding. No new package, dependency, release mode or auth architecture is
selected.

## Scale and review focus

Counts use tracked files at the reviewed commit, excluding installed tools,
virtual environments and build output. Source counts include TypeScript/module
configuration and Python fixtures but exclude `*.spec.*`, `*.test.*` and
`*.stories.*`; test counts include the spec/test files. Lines include comments
and blanks. They locate review effort, not deletion targets.

| Area | Source files / lines | Test files / lines | Concentrated responsibilities |
| -- | -- | -- | -- |
| `libs/ng` | 30 / 3,140 | 20 / 4,497 | Utilities 650 lines; services 363; outgoing auth services 255 |
| `libs/ng-bootstrap` | 60 / 5,220 | 29 / 2,249 | CRUD manager 703; table 316; configuration 292; form 266 |
| `libs/ng-tailwind` | 5 / 172 | 3 / 570 | Native button and shipped CSS contract |
| `apps` | 42 / 1,898 | 5 / 926 | Demo, two backend fixtures and browser acceptance |
| `tools` | 2 / 536 | 0 / 0 | Consumer orchestration 506; export patch 30 |

Specs contain 55,990 whitespace-delimited words in 56 Markdown files, including
routing/index pages, versus architecture 4,950, guides 5,468, runbooks 1,270 and
releases 2,746. The largest specs are E17 cutover (7,641), E17 consumer
migration (4,376), E12 (4,134), E17 docs conversion (3,549) and F11.1 (2,792).
Several remain unfinished: length alone does not justify cutting their
acceptance or promoting deferred work.

Only three tracked source/test files contain dotted work-ID references under the
review pattern. There is no basis for a repository-wide test rename. The
Tailwind CSS contract suite names F8.2 in descriptions, but reading shipped CSS
is not inherently brittle: token names, namespace rules and layers are its API.

## Correctness and lifecycle findings

Priority indicates proposed remediation order, not observed incident frequency.
Each case needs an executable regression before a fix. Paths are relative to the
repository root.

| Priority | Evidence | Failure or contract gap | Owner |
| -- | -- | -- | -- |
| High | `libs/ng-bootstrap/crud/src/lib/crud/crud.manager.ts:468–480` | `if (!value)` serializes valid zero and false values as null before create/update | F19.6 |
| High | `libs/ng-bootstrap/form/src/lib/form/fields/multi-typeahead-field/multi-typeahead-field.component.ts:30–77` and its template `:17–24` | Filtering reads `inputValue`, which the input never binds; callbacks are not registered as a value accessor, selection does not patch the parent control, and disabled handling is a stub | F19.6 |
| Medium | `libs/ng-bootstrap/form/src/lib/form/form.component.ts:86–106` | Early return compares only comma-joined control names, so new validators/context with the same names are skipped; delimiter-containing names can also collide | F19.6 |
| Medium | `libs/ng/auth/src/lib/auth.directives.ts:26–33,48–55` | Every allowed input assignment appends an embedded view; allowed-to-allowed rebinding can duplicate content | F19.4 |
| Medium | `libs/ng-bootstrap/auth/src/lib/user/settings/settings.service.ts:58–66`; `libs/ng-bootstrap/shell/src/lib/color-mode/color-mode.ts:63–69` | Root-owned subjects retain callbacks; registration returns no disposal handle and the component supplies no teardown | F19.7 |
| Medium | Same settings service `:72–100` | Reset aliases exported defaults, then update mutates that object; reset also omits change notifications, leaving existing views stale | F19.7 |
| Medium | `libs/ng-bootstrap/src/lib/table/table.component.ts:179–204,288–297` | Manual plugin destruction exists but no component teardown calls it; highlight timers survive destruction, and interpolated unquoted attribute selectors fail for some valid string IDs | F19.5 |
| Medium, defensive lifecycle case | `libs/ng/core/src/lib/core.eventstream.ts:89–114,117–124` | A repeated terminal error overwrites the timer handle without cancelling the prior timer; close clears only the last one. Old handlers have no source-identity guard | F19.4 |

The stream finding is a controlled-source scenario to reproduce; this review
does not establish that a native browser delivers duplicate terminal errors in
ordinary use. Keep the existing browser-managed reconnect path and add only the
ownership guards justified by the regression. Do not grow a reconnect framework.

The settings service sits in the auth entry point that E5 intends to replace.
Before building F19.7, establish which settings owner survives that replacement.
Fixing observer/default ownership must not revive outgoing auth UI.

The auth review also found default/disabled-auth request blocking, array merges
that cannot clear ignored routes, and 401/403 handling in the success channel.
The last issue and the token/origin risks are already described by
[E5](../E5-session-client-auth/index.md#why-replace-not-fix). E5 owns the
replacement; do not create a parallel JWT repair plan. Permission directives are
explicitly retained by E5 and therefore have a separate bounded fix here.

## Remove overlapping ownership only where it helps

| Current ownership | Proposed simplification | Contract to preserve |
| -- | -- | -- |
| `ConfigurerService` holds four caches, diffs input and override objects, then the component computed performs another diff (`bootstrap.component.ts:60–157,206–212`) | Measure whether signal-owned resolution can replace redundant per-instance bookkeeping | Default/global/input/runtime precedence, subclass hooks, callback identity, no caller mutation and destroy cleanup |
| Option resolution uses element-wise deep merges; `mergeOptions` alone explicitly replaces arrays (`:268–281`) | Decide the array contract once, then use one resolution path | Empty and shorter arrays, runtime replacement versus merge, compatibility guidance for a changed contract |
| CRUD manager owns dialogs, table configuration, import/export, error display, retries and conversion | First fix conversion; then consider a small extraction only where state/ownership becomes clearer | List policy remains in `ng/crud`; renderer wiring remains in Bootstrap; ETags, retry keys and errors stay intact |
| Multi-typeahead inherits single-value behavior while maintaining separate selection/callback state | Choose one reactive-form integration, remove disconnected state | Custom filter/formatter, reset, disabled/touched semantics, no caller-array mutation |
| README, docs landing page, architecture and specs repeat inventories/setup | Short entry summaries link to one current explanation for each audience | Packed READMEs stay self-contained; specs keep unfinished acceptance |

Do not split `core.utils.ts` because it is 650 lines, or split the 703-line
manager merely to lower a metric. Name the independent responsibility and
crossing state first. Small utility wrappers and the 66-line Tailwind button do
not warrant a new abstraction for symmetry with larger components.

## Tests and measurements

The table's unit suite currently covers creation and toolbar ID, not plugin
ownership. Multi-typeahead's suite covers creation and a direct `writeValue`
call without checking form integration. These are concrete coverage gaps for the
findings above. The manager tests use a string-indexed `call` helper
(`crud.manager.spec.ts:68–72`); a typed test subclass or rendered action gives
refactors a smaller private surface to preserve. Keep request/error assertions
at the adapter boundary rather than moving all tests into pure helpers.

Configuration experiments compare repeated reads, changed inputs/overrides and
mount/destroy churn at representative form/table sizes. Record diff/merge call
counts, retained instances, elapsed time and peak memory before selecting a
change. A no-regression threshold is chosen for each workload first. Lifecycle
tests use fake timers and controlled source events; operation counts belong in
deterministic tests, noisy time/memory comparisons in the brief. No performance
gain has been measured by this review.

Preserve actual browser cascade/accessibility tests and temporary packed
consumer installs. Workspace unit success cannot prove published peer resolution
or vendor initialization. Report backend fixture execution and skips separately;
running one fixture does not prove the other backend.

## Packaging and boundary findings

`eslint.config.mjs:20–30` permits every library tag to depend on every other
tag. ADR-0002 explicitly says review currently enforces the direction. F19.8
turns that existing decision into executable checks, including forbidden
core-to-presentation and presentation-to-presentation imports. Existing lint
support must cover secondary entry points as well as top-level project tags.

At the source baseline, the 506-line consumer script tested `ng` and Tailwind
but accepted no Bootstrap target. The current F17.5 migration at `1bea6da` has
replaced it with manifest matrices and `tools/consumer` hooks; the gap remains:
`ng-bootstrap/project.json` declares no consumer check, despite its vendor
initialization, secondary entry points and theme assets. F19.8 adds a packed
Bootstrap application using the existing
[F17.5 migration](../E17-kiln-adoption/F17.5-consumer-checks-in-kiln.md).
[F17.4](../E17-kiln-adoption/F17.4-asset-exports.md) removes export patching. Do
not restore either removed script or duplicate their manifest/matrix design.
Keep the currently declared Angular floor and matrix; the workspace's newer dev
version alone does not change published support.

## Documentation that stays small

`docs/index.md` still introduces only two publishable libraries. The development
guide recommends direct wrapped tools while the repository standard requires
`task`. `ConfigurableComponent.updateOptions` says undefined clears overrides,
but its implementation does nothing; the explicit `clearOverrides` method
already exists. The settings docstring calls a nonexistent `updateSettings`
method and constructs an injectable service directly. F19.2 reconciles those
specific contracts without inventing command wrappers or expanding consumer
flows with implementation details.

F19.1 establishes the brief lifecycle described on the epic before trimming
settled prose. Current configuration/build guidance goes to its existing
architecture, guide or package README owner. Decisions go to ADRs. Work pages
keep scope, permanent IDs, dependencies, checkable acceptance and unresolved
decisions; they do not accumulate build transcripts. No brief is created until
its story is next, and no brief survives that story's close/removal. Shared
template/check adoption follows kiln ownership, not a generated-file patch.

This is a retention pass, not a spec reset. Existing closed features, release
records, E17's unfinished acceptance and deferred triggers remain intact.
