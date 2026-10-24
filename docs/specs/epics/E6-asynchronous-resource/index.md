# E6 — Asynchronous resource

**Status:** elaborating · **Owner:** ngkit

**Source:** former roadmap item E1; elaborated at the owner's request, 2026-10-24, against Angular 22.1.

Loading-UX timings for Angular's resources: signals that say when a load has lasted long enough to show a skeleton, to say it is slow, and to say it has stalled. Angular's `resource()`, `rxResource()` and `httpResource()` cover everything else the original contract asked for, so this epic ships only the timings, and keeping the previous value across a changed request waits for Angular's own composition API to be stable.

**Depends on:** [E1](../E1-packaging-and-compatibility/index.md) (done).

[Back to the board](../../index.md)

| Feature                                            | Status      | Scope                                                                     |
| -------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| [F6.1 — `loadingTimings`](F6.1-loading-timings.md) | elaborating | Skeleton, slow and stalled signals over any loading signal, in `ng/core`. |
| [F6.2 — `keepPrevious`](F6.2-keep-previous.md)     | deferred    | A resource that keeps its last value while a changed request loads.       |

## Design

**What Angular 22.1 already does** ([ADR-0001](../../../adr/ADR-0001.md) principle 1). The earlier `createAsyncResource({ request, loader, refresh, classifyError, preservePrevious, timings })` contract listed requirements that the framework now meets. Each one, checked against `@angular/core` 22.1.7 and `@angular/common` 22.1.7:

| Requirement in the earlier contract                                 | Covered by                                                                                                                                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status: idle\|loading\|ready\|error`, `value`, `error`, `reload()` | `Resource.status` (`idle`, `loading`, `reloading`, `resolved`, `local`, `error`), `value`, `error`, `isLoading`, `hasValue()`, `reload()`; all stable (`@publicApi 22.0`).    |
| An undefined request is idle and cancels prior work                 | `params` returning `undefined` puts the resource in `idle` and aborts the pending load.                                                                                       |
| Teardown through `DestroyRef`; cancel on a new request; stale guard | The resource is destroyed with its injector; a new `params` value aborts the previous load (`abortSignal`), and `rxResource` unsubscribes, so a late emission is dropped.     |
| Synchronous throws are classified; empty completion is an error     | `rxResource` turns a stream error into the `error` state, and a stream that completes before producing a value into an error (`Resource completed before producing a value`). |
| Error metadata resets at each attempt                               | A new load replaces the state; `error()` reflects only the latest attempt.                                                                                                    |
| `refreshing`                                                        | `status() === 'reloading'`.                                                                                                                                                   |
| `timeout`                                                           | `HttpClient` and `httpResource` take a `timeout` option (ms); in an `rxResource` stream, RxJS `timeout()`.                                                                    |
| `classifyError(error) => E`                                         | `computed(() => classify(resource.error()))` in the application; [`problemOf`](../E14-problem-client/index.md) reads RFC 9457 bodies.                                         |
| `preservePrevious`                                                  | Angular's resource composition with snapshots (`resourceFromSnapshots`, `linkedSignal`), still `@experimental`: [F6.2](F6.2-keep-previous.md).                                |

What Angular lacks is the timing: `isLoading` flips immediately, so a fast response flashes a skeleton, and nothing tells the view that a load is slow or stalled. That is [F6.1](F6.1-loading-timings.md).

**No new entry point.** The timings need only `@angular/core`, so they live in `@rn-forge/ng/core`, as [E15](../E15-event-stream/index.md) and [E16](../E16-resource-invalidation/index.md) do. The `libs/ng/resource/` entry point of the earlier contract is not created.

**The resource screen keeps its `rxResource`.** `loadingTimings` takes a `Signal<boolean>`, not a loader, so it composes with `createCrudList()`'s `loading` signal ([Resource screen](../../../architecture/resource-screen.md)) without changing it. Using the timings in `@rn-forge/ng-bootstrap/crud`, whose table shows its loading overlay as soon as `loading()` is true, is not part of this epic.

**Prior art, checked on npm 2026-10-24.** `ngxtension` 7.3.1 (maintained) has `derive-loading`, an RxJS operator that delays a loading flag and holds it for a minimum time; it works on Observables, not on a resource's signals, has no slow or stalled state, and would add `ngxtension` and its `@use-gesture/vanilla` peer for one operator. `spin-delay` 2.0.1 is a React hook. `@ngneat/loadoff` 2.1.0 was last published 2024-08 and is RxJS-based. The timings are hand-rolled under ADR-0001 exemption 3; the doc comment records it.

### Considered and rejected

- **`createAsyncResource` wrapping `resource()`.** It re-implements cancellation, stale guarding, idle and error states that `resource()` already has (ADR-0001 principle 1), and it would hide the `Resource` that the wrapper rules require to stay reachable.
- **A `classifyError` option.** It is one `computed` in the application, and a library option adds nothing to it.
- **A `timeout` threshold in the timings.** A timeout fails the request, so it belongs to the request (`HttpClient`'s `timeout`, or RxJS `timeout()`), not to a view signal.
