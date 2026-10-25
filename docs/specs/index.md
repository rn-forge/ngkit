# ngkit work

What ngkit is made of and what is left to do. The board says what is next; the epic
says how; its ADRs say why. `done` means implemented; the
[release pages](../releases/index.md) record what shipped.

As of 2026-10-24, the libraries' packaging, the retired HTTP entry point, core correctness, the `@rn-forge/ng/crud` controller with its Bootstrap renderer and the portable CI are implemented and shipped as [Release 1](../releases/release-1/index.md) (`v0.2.0`, 2026-10-14). Wire acceptance of the resource screen against a real backend (F4.3) is done, which closes E4. [Release 2](../releases/release-2/index.md) scope is F4.3 (done), E5, E8, E11, E14, E15 and E16 (E8, E14, E15 and E16 added by the owner, 2026-10-24). E14 (RFC 9457 problem helpers, with ADR-0004 amended), E15 (`createEventStream`) and E16 (`Invalidation`) are done in `@rn-forge/ng/core`. Next: F11.1 (`@rn-forge/ng-plugin`), and accept ADR-0006 (S5.1.1). E11's `nx-plugin` and workspace CLI (F11.2, F11.3) are retired: kiln owns repository-level setup. Session client auth is redefined around a same-origin backend session and has stories, waiting on its client-model ADR and wire contract; the Angular app generators are planned with stories; E6 is elaborated (2026-10-24) down to loading timings in `ng/core`, waiting on one open question and a release; E8 (`@rn-forge/ng-tailwind`) is elaborated (2026-10-24) into four features against a survey of three applications to be rebuilt on kiln's Angular baseline, with ADR-0008 accepted (2026-10-24); the owner assigned it to Release 2 and kept the `rnf` selector prefix for both packages (2026-10-24), F8.1 (the package and its release wiring) is done, F8.2 (`tokens.css`, `base.css`, `tailwind.css`) and F8.3 (`rnfButton`) are done, F8.4 (consumer builds, WCAG AA in a browser, application CSS wins the cascade) is done, which closes E8; everything else is deferred.

## Board

### In progress

None.

### Planned

| Epic                                                                  | Next step              |
| --------------------------------------------------------------------- | ---------------------- |
| [E11 — Workspace generators](epics/E11-workspace-generators/index.md) | Start F11.1; Release 2 |

### To elaborate

| Epic                                                                  | Next step                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [E5 — Session client auth](epics/E5-session-client-auth/index.md)     | Accept ADR-0006 (S5.1.1) and settle the wire contract (S5.1.2); Release 2 |
| [E6 — Asynchronous resource](epics/E6-asynchronous-resource/index.md) | Owner answers F6.1's open question and assigns a release                  |

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
- **Status.** `elaborating`, `planned`, `in progress`, `done` or `deferred` (with
  entry criteria). Stories carry their own status.
- **A decision is its own story**, so work can depend on the decision without
  depending on its implementation.
- **Open questions live on the feature or epic they block.**
- **Acceptance is checked inside ngkit.**
- **Don't start or elaborate a deferred epic unless the owner asks.**
