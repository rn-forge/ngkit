# E4 — Standard resource screen

| | |
| -- | -- |
| **State** | Closed |
| **Start Date** | 2026-09-27 |
| **Closed Date** | 2026-10-17 |

Implemented in commit `1fc3c8d`.

**Release:** [Release 1](../../../releases/release-1/index.md) (F4.1, F4.2), [Release 2](../../../releases/release-2/index.md) (F4.3)

**Source:** former roadmap item H4.

The CRUD resource screen is rebuilt as a client of published wire standards ([ADR-0005](../../../adr/ADR-0005.md)): a presentation-free controller, data-source contract and `standardDataSource()` in `@rn-forge/ng/crud`, rendered by `@rn-forge/ng-bootstrap/crud`. The standards, contract and screen behavior are in [Resource screen](../../../architecture/resource-screen.md). Decided 2026-09-23: `ng-bootstrap/crud` is rewritten on the new controller, not kept alongside it.

[Back to the board](../../index.md)

<!-- BEGIN derived features -->
<!-- END derived features -->
