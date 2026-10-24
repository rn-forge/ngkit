# E16 — Key invalidation for `httpResource`

**Status:** elaborating · **Owner:** ngkit

**Source:** owner request, 2026-10-21, moved out of [E6](../E6-asynchronous-resource/index.md) 2026-10-23: an application rewrite that reads all its data through `httpResource` needs one place to refetch every reader of a kind of data after a write, and builds it in the application first so it can be swapped for this one later.

Angular's `httpResource` refetches when a signal its request function reads changes, and each resource has its own `reload()`. Nothing refetches several resources from one place, so an application that mutates data has to hold every reader's `reload` or invent a shared signal. [ADR-0001](../../../adr/ADR-0001.md) principle 1 says to use the framework first; the framework supplies the refetch trigger, and this is only the shared signal. It is a hand-rolled few lines under ADR-0001 exemption 3, and lives in `@rn-forge/ng/core` because it needs only `@angular/core`.

[Back to the board](../../index.md)

| Feature                                         | Status      | Scope                                                          |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------- |
| [F16.1 — `Invalidation`](F16.1-invalidation.md) | elaborating | The service, its typed accessor, and its `httpResource` tests. |

## Design

It does not fetch, cache or deduplicate: it is the trigger only. It holds no keys of its own and imports no application type; the key union is the application's type argument, given once through a typed accessor, because a root-provided generic class loses its type argument at `inject()`.
