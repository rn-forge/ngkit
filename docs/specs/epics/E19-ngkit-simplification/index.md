# E19 — ngkit simplification

|  |  |
| -- | -- |
| **State** | Active |
| **Start Date** | 2026-11-18 |

<!-- BEGIN derived features -->

| Feature | State | Iteration | Stories |
| -- | -- | -- | -- |
| [F19.1 — Short records and disposable build briefs](F19.1-specs-and-briefs.md) | Closed | release-5 | 2 Closed |
| [F19.2 — One current explanation per audience](F19.2-current-documentation.md) | New | release-5 | 2 New |
| [F19.3 — Behavioral coverage and measured simplification](F19.3-behavioral-baselines.md) | Active | release-5 | 1 New · 1 Closed |
| [F19.4 — Bounded stream and permission-view lifetimes](F19.4-core-and-permissions.md) | Closed | release-5 | 2 Closed |
| [F19.5 — Configuration and widgets with explicit owners](F19.5-configuration-and-widgets.md) | Active | release-5 | 1 New · 1 Closed |
| [F19.6 — Forms and CRUD preserve application values](F19.6-forms-and-crud.md) | Active | release-5 | 2 New · 1 Closed |
| [F19.7 — Settings notifications with consumer lifetimes](F19.7-settings-lifetimes.md) | Active | release-5 | 1 New · 1 Closed |
| [F19.8 — Executable package boundaries and consumer contracts](F19.8-boundaries-and-consumers.md) | New | release-5 | 2 New |

<!-- END derived features -->

Simplify the existing libraries, tests and documentation around observable
contracts, explicit lifetimes and one owner per fact. Correctness regressions
come before refactoring; performance changes follow measurements. The
[review and proposed design](design.md) records the source observations and
their limits. The owner scheduled this epic into
[Release 5](../../../releases/release-5/index.md) on 2026-11-18.

## Order

1. F19.1 establishes the short-record and temporary-brief boundary.
1. F19.3 adds the behavioral cases and measurements needed by each change.
1. F19.4–F19.7 fix reproduced defects before simplifying the affected code.
1. F19.8 verifies package boundaries and packed consumers, coordinating with the
   existing E17 migration. F19.2 updates current guidance alongside changes;
   F19.1 cuts settled prose only after preserving its contracts.

## Build briefs

Permanent feature pages retain scope, decisions, acceptance, dependencies and
state. Build instructions belong in an unpublished `_briefs/S<n>.<m>.<k>.md`
beside the feature, written only when that story is next. No published page
links to a brief. A brief names its story, source commit, goal, settled
decisions, current behavior, bounded changes, regression cases, validation and
result. A decision brief requests evidence and a comparison; dependent build
work waits for the decision to settle.

The implementer runs the brief's validation, including the full gate, and
records commands, exit codes, changed files and deviations in the brief. Review
uses those results and reruns the targeted checks after integration; the full
gate runs again at feature close. The change closing or removing the story
deletes its brief, retaining any newly settled contract in acceptance or an ADR
and at most one outcome line in the story. Git history retains the instructions
and execution evidence. Briefs are written against current code, not all
generated up front. Shared routing/check changes remain kiln-owned; F19.1
describes the local adoption without editing a generated template here.

## Scope constraints

- Preserve public imports, Angular peer support, zone and zoneless coverage,
  wire formats, accessibility, optional features and vendor escape hatches. An
  intentional contract change gets explicit acceptance, a changelog entry and
  a versioning assessment.
- Follow [ADR-0001](../../../adr/ADR-0001.md),
  [ADR-0002](../../../adr/ADR-0002.md), [ADR-0003](../../../adr/ADR-0003.md),
  [ADR-0004](../../../adr/ADR-0004.md), [ADR-0005](../../../adr/ADR-0005.md),
  [ADR-0007](../../../adr/ADR-0007.md) and
  [ADR-0008](../../../adr/ADR-0008.md). No dependency addition, publishing,
  history rewrite or generated-file edit is authorized by this epic.
- E5 owns the session-auth replacement and its proposed ADR-0006. E6 owns
  loading timings; deferred epics and parked ideas stay untouched.
- F17.4 owns source-declared asset exports; F17.5 owns the consumer-check
  migration. E18 owns any future npm/independent-version change. This epic
  does not implement those features again.
- Preserve permanent IDs, closed work, unfinished acceptance and shipped scope.
  Do not replace the existing epic inventory with a new taxonomy.

## Completion

Every feature's observable acceptance holds; changed behavior has regression
coverage. Relevant format, lint, test, build and packed-consumer checks run
through `task`, with actual results distinguished from skipped or blocked
checks. The completed epic passes `task validate` and idempotent
`task docs:generate`. Measurements name workload, environment, time, memory and
operation counts; fewer lines alone establish no performance improvement.

## Considered and rejected

- A line-count reduction target, universal widget framework or wholesale
  rewrite. Each adds scope without proving a simpler contract.
- Blanket removal of source-reading CSS tests: token names and cascade layers
  are shipped API and need both artifact checks and browser coverage.
- Repairing the outgoing JWT subsystem as a second auth roadmap. E5 already owns
  its replacement; retained permission vocabulary can be fixed separately.
