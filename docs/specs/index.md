# ngkit work

What ngkit is made of and what is left to do. The board says what is next; the epic
says how; its ADRs say why. `done` means implemented; the
[release pages](../releases/index.md) record what shipped.

As of 2026-10-16, the libraries' packaging, the retired HTTP entry point, core correctness, the `@rn-forge/ng/crud` controller with its Bootstrap renderer and the portable CI are implemented and await [Release 1](../releases/release-1/index.md); what is left is the owner's merge and the first deploy and release from `main`. Wire acceptance of the resource screen against a real backend (F4.3) has its fixtures and e2e suite and moved to [Release 2](../releases/release-2/index.md), waiting only on its CI runs. OIDC client auth has stories but waits on its client-model decision, and the workspace generators have open questions to answer; everything else is deferred.

## Board

### In progress

| Epic                                                                        | Release                                                                                                      | Next step                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [E4 — Standard resource screen](epics/E4-standard-resource-screen/index.md) | [Release 1](../releases/release-1/index.md) (F4.1, F4.2); [Release 2](../releases/release-2/index.md) (F4.3) | F4.3: S4.3.5 first CI run on both paths (Release 2)                                    |
| [E13 — Portable CI](epics/E13-portable-ci/index.md)                         | [Release 1](../releases/release-1/index.md)                                                                  | Owner: merge, then F13.3 deploy on `main` and F13.4 release checks (the Release 1 cut) |

### To elaborate

| Epic                                                                  | Next step                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [E5 — OIDC client auth](epics/E5-oidc-client-auth/index.md)           | Decide S5.1.1 (browser client or BFF), then choose the OIDC library |
| [E11 — Workspace generators](epics/E11-workspace-generators/index.md) | Answer the open questions, then write stories with acceptance       |

### Deferred

| Epic                                                                       | Entry criteria                               |
| -------------------------------------------------------------------------- | -------------------------------------------- |
| [E6 — Asynchronous resource](epics/E6-asynchronous-resource/index.md)      | The owner schedules it                       |
| [E7 — Theme controller](epics/E7-theme-controller/index.md)                | The owner schedules it (depends on E3, done) |
| [E8 — `@rn-forge/ng-tailwind` package](epics/E8-tailwind-package/index.md) | The owner schedules it                       |
| [E9 — Presentation primitives](epics/E9-presentation-primitives/index.md)  | E8 is done and the owner schedules it        |
| [E10 — Connected menu](epics/E10-connected-menu/index.md)                  | E8 is done and the owner schedules it        |
| [E12 — On-demand features](epics/E12-on-demand-features/index.md)          | The row's trigger occurs                     |

### Done

| Epic                                                                              | Implemented            |
| --------------------------------------------------------------------------------- | ---------------------- |
| [E1 — Packaging and compatibility](epics/E1-packaging-and-compatibility/index.md) | 2026-09-20 (`c30d63a`) |
| [E2 — Retire the HTTP entry point](epics/E2-retire-http-entry-point/index.md)     | 2026-09-23 (`c30d63a`) |
| [E3 — Core correctness](epics/E3-core-correctness/index.md)                       | 2026-09-23 (`1f54842`) |

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
