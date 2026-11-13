# E4 — Standard resource screen

|  |  |
| -- | -- |
| **State** | Closed |
| **Start Date** | 2026-09-27 |
| **Closed Date** | 2026-10-17 |

Implemented in commit `1fc3c8d`.

**Release:** [Release 1](../../../releases/release-1/index.md) (F4.1, F4.2),
[Release 2](../../../releases/release-2/index.md) (F4.3)

**Source:** former roadmap item H4.

The CRUD resource screen is rebuilt as a client of published wire standards
([ADR-0005](../../../adr/ADR-0005.md)): a presentation-free controller,
data-source contract and `standardDataSource()` in `@rn-forge/ng/crud`, rendered
by `@rn-forge/ng-bootstrap/crud`. The standards, contract and screen behavior
are in [Resource screen](../../../architecture/resource-screen.md). Decided
2026-09-23: `ng-bootstrap/crud` is rewritten on the new controller, not kept
alongside it.

[Back to the board](../../index.md)

<!-- BEGIN derived features -->

| Feature | State | Iteration | Stories |
| -- | -- | -- | -- |
| [F4.1 — `@rn-forge/ng/crud` entry point](F4.1-crud-entry-point.md) | Closed | release-1 | 5 Closed |
| [F4.2 — Bootstrap renderer and demo](F4.2-bootstrap-renderer-and-demo.md) | Closed | release-1 | 2 Closed |
| [F4.3 — Accept the screen against a real backend](F4.3-wire-acceptance.md) | Closed | release-2 | 6 Closed |

<!-- END derived features -->
