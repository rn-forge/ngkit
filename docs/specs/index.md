# ngkit work

What ngkit is made of and what is left to do. The board says what is next; the epic
says how; its ADRs say why. `done` means implemented; the
[release pages](../releases/index.md) record what shipped.

As of 2026-10-26, the libraries' packaging, the retired HTTP entry point, core correctness, the `@rn-forge/ng/crud` controller with its Bootstrap renderer and the portable CI are implemented and shipped as [Release 1](../releases/release-1/index.md) (`v0.2.0`, 2026-10-14). [Release 2](../releases/release-2/index.md) (F4.3, E8, E14, E15 and E16) shipped as `v0.3.0` (2026-10-25). The owner moved E5 (F5.1–F5.4) and F11.1 to [Release 3](../releases/release-3/index.md) (2026-10-25): E5 will be refined further once a released server library's auth module is defined, and F11.1 is picked up after ngkit is cut over to kiln. E11's `nx-plugin` and workspace CLI (F11.2, F11.3) are retired: kiln owns repository-level setup. E6 is elaborated (2026-10-24) down to loading timings in `ng/core`, waiting on one open question and a release; everything else is deferred. E17 (2026-11-02) adopts kiln's `node-lib` archetype: F17.1 converts the docs to kiln's work model, F17.2 cuts the CI over; it is in Release 3, and F17.1 started 2026-11-03.

## Board

### In progress

| Epic | Next step |
| -- | -- |
| [E17 — kiln adoption](epics/E17-kiln-adoption/index.md) | F17.1 started 2026-11-03 (S17.1.2, the spec conversion); then S17.2.1 (`kiln init`) and the rest of F17.1 and F17.2; Release 3 |

### Planned

| Epic                                                                  | Next step                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [E11 — Workspace generators](epics/E11-workspace-generators/index.md) | Start F11.1 after the kiln cutover (E17); Release 3                                         |

### To elaborate

| Epic                                                                  | Next step                                                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [E5 — Session client auth](epics/E5-session-client-auth/index.md)     | Refine once a released server library's auth module is defined; accept ADR-0006 (S5.1.1); Release 3 |
| [E6 — Asynchronous resource](epics/E6-asynchronous-resource/index.md) | Owner answers F6.1's open question and assigns a release                                            |

### Deferred

| Epic                                                                      | Entry criteria                               |
| ------------------------------------------------------------------------- | -------------------------------------------- |
| [E7 — Theme controller](epics/E7-theme-controller/index.md)               | The owner schedules it (depends on E3, done) |
| [E9 — Presentation primitives](epics/E9-presentation-primitives/index.md) | E8 is done and the owner schedules it        |
| [E10 — Connected menu](epics/E10-connected-menu/index.md)                 | E8 is done and the owner schedules it        |
| [E12 — On-demand features](epics/E12-on-demand-features/index.md)         | The row's trigger occurs                     |

### Done

| Epic                                                                                  | Implemented            |
| ------------------------------------------------------------------------------------- | ---------------------- |
| [E1 — Packaging and compatibility](epics/E1-packaging-and-compatibility/index.md)     | 2026-09-20 (`c30d63a`) |
| [E2 — Retire the HTTP entry point](epics/E2-retire-http-entry-point/index.md)         | 2026-09-23 (`c30d63a`) |
| [E3 — Core correctness](epics/E3-core-correctness/index.md)                           | 2026-09-23 (`1f54842`) |
| [E13 — Portable CI](epics/E13-portable-ci/index.md)                                   | 2026-10-14 (`d1e026c`) |
| [E4 — Standard resource screen](epics/E4-standard-resource-screen/index.md)           | 2026-10-17 (`1fc3c8d`) |
| [E16 — Key invalidation for `httpResource`](epics/E16-resource-invalidation/index.md) | 2026-10-24             |
| [E15 — Server-sent event stream](epics/E15-event-stream/index.md)                     | 2026-10-24             |
| [E14 — RFC 9457 problem client support](epics/E14-problem-client/index.md)            | 2026-10-24             |
| [E8 — `@rn-forge/ng-tailwind` package](epics/E8-tailwind-package/index.md)            | 2026-10-24             |

## Conventions

- **Taxonomy.** Epic `E<n>` → feature `F<n>.<m>` → story `S<n>.<m>.<k>`. IDs are
  permanent.
- **State.** `New`, `Active`, `Closed` or `Removed`, in each page's metadata
  table; deferred work is `New` tagged `deferred`, with entry criteria. Stories
  carry their own `**State:**` line. Interim rules until kiln's `init`:
  [`_structure.md`](_structure.md).
- **A decision is its own story**, so work can depend on the decision without
  depending on its implementation.
- **Open questions live on the feature or epic they block.**
- **Acceptance is checked inside ngkit.**
- **Don't start or elaborate a deferred epic unless the owner asks.**
