# ngkit work

What ngkit is made of and what is left to do. The board says what is next; the
epic says how; its ADRs say why. `done` means implemented; the
[release pages](../releases/index.md) record what shipped.

As of 2026-10-26, the libraries' packaging, the retired HTTP entry point, core
correctness, the `@rn-forge/ng/crud` controller with its Bootstrap renderer and
the portable CI are implemented and shipped as
[Release 1](../releases/release-1/index.md) (`v0.2.0`, 2026-10-14).
[Release 2](../releases/release-2/index.md) (F4.3, E8, E14, E15 and E16) shipped
as `v0.3.0` (2026-10-25). The owner moved E5 (F5.1–F5.4) and F11.1 to
[Release 3](../releases/release-3/index.md) (2026-10-25): E5 will be refined
further once a released server library's auth module is defined, and F11.1 is
picked up after ngkit is cut over to kiln. E11's `nx-plugin` and workspace CLI
(F11.2, F11.3) are retired: kiln owns repository-level setup. E6 is elaborated
(2026-10-24) down to loading timings in `ng/core`, waiting on one open question
and a release; everything else is deferred. E17 (2026-11-02) adopts kiln's
`node-lib` archetype: F17.1 converts the docs to kiln's work model, F17.2 cuts
the CI over; it is in Release 3, and F17.1 started 2026-11-03.

The Releases and Backlog sections below are derived from the epic, feature and
release pages by `task docs:generate`; never edit inside their fence.

<!-- BEGIN derived board -->

## Releases

| Release | Status | Features |
| -- | -- | -- |
| [Release 3](../releases/release-3/index.md) | in progress | 3 Active · 6 New · 1 Removed |
| [Release 2](../releases/release-2/index.md) | shipped (2026-10-25) | 9 Closed |
| [Release 1](../releases/release-1/index.md) | shipped (2026-10-14) | 7 Closed |

## Backlog

Features with no Iteration, by State and epic.

### New

| Epic | Features |
| -- | -- |
| [E6 — Asynchronous resource](epics/E6-asynchronous-resource/index.md) | [F6.1](epics/E6-asynchronous-resource/F6.1-loading-timings.md) |

### Deferred

| Epic | Features | Entry criteria |
| -- | -- | -- |
| [E5 — Session client auth](epics/E5-session-client-auth/index.md) | [F5.5](epics/E5-session-client-auth/F5.5-situational-client-extensions.md) | Per feature; see the epic. |
| [E6 — Asynchronous resource](epics/E6-asynchronous-resource/index.md) | [F6.2](epics/E6-asynchronous-resource/F6.2-keep-previous.md) | Per feature; see the epic. |
| [E7 — Theme controller](epics/E7-theme-controller/index.md) | — | the owner schedules it |
| [E9 — Presentation primitives](epics/E9-presentation-primitives/index.md) | — | [E8](epics/E8-tailwind-package/index.md) is done and the owner schedules it |
| [E10 — Connected menu](epics/E10-connected-menu/index.md) | — | [E8](epics/E8-tailwind-package/index.md) is done and the owner schedules it |
| [E12 — On-demand features](epics/E12-on-demand-features/index.md) | F12.1, F12.2, F12.3, F12.4, F12.5, F12.6, F12.7, F12.8, F12.9, F12.10, F12.11 | the row's trigger occurs |

<!-- END derived board -->

Ideas not yet agreed as work are parked in the [ideas list](ideas/index.md).

Every epic, by number, is on [the epic list](epics/index.md).

## Conventions

The work model is kiln's, in `docs/specs/_structure.md`.

## How this repository differs

- Every acceptance line is checkable inside this repository. When acceptance
  needs a host, such as an application or a library workspace, a test builds
  one in a temporary directory.
- A dependency on another repository's software is a version or git pin in the
  manifest of the code that uses it, plus at most an entry criterion that can
  be observed from outside that repository ("its release-1 tags exist").
- Another repository's pages, paths, spec IDs and internal status are not cited
  or restated. A requirement or finding that came from elsewhere is written
  here in full, as this repository's own. The exception is kiln, which owns
  repository-level setup: its specs and ADRs may be cited by ID as the reason
  work here is retired or out of scope ([ADR-0007](../adr/ADR-0007.md)).
- No page here is written for another repository to cite.

**Checking removed behaviour:** a check that a removed symbol is gone asks "does
any current page describe it as present?", not "does the name appear?". A page
may name removed behaviour to say it is gone.
