# E6 — Asynchronous resource

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** the owner schedules it.

**Source:** former roadmap item E1.

A new `libs/ng/resource/` secondary entry point that wraps Angular's `resource()`/`httpResource()` only for the loading-UX timings and error classification they lack. Check first whether Angular already covers the need ([ADR-0001](../../../adr/ADR-0001.md) principle 1).

**Depends on:** [E1](../E1-packaging-and-compatibility/index.md) (done).

[Back to the board](../../index.md)

## Design

Proposed contract:

```ts
createAsyncResource<R, T, E>({
  request: () => R | undefined,
  loader: (request: R) => Observable<T>,
  refresh?: () => unknown,
  classifyError: (error: unknown) => E,
  preservePrevious: boolean,
  timings: { skeleton: number, slow: number, stalled: number, timeout: number }
})
```

Return readonly signals `status: idle|loading|ready|error`, `value`, `error`, `showSkeleton`, `slow`, `stalled`, `refreshing`, and `reload()`. Explicit undefined request is disabled/idle and cancels prior work. Value retention on a changed key is controlled by `preservePrevious`; state this explicitly.

Requirements:

1. No app types: error classification and refresh are callbacks.
2. Use a teardown owned by DestroyRef. Cancel subscription and all timers on new request, disabled request and destruction. Guard against stale results.
3. Invoke loader through defer or equivalent to classify synchronous throws. Define one-shot semantics: first value completes; empty completion becomes a documented error, never permanent loading. Reset error metadata at each new attempt.
4. Default timing values may be 300/1000/10000/30000 ms; validate ordering and permit configuration. No HTTP or product copy in the timing mechanism.
5. Fake-timer tests: fast response; each threshold; retry; retained value; changed key; error then success; one error then an unrelated error (no leftover metadata); disable while pending; destroyed resource; stale late emission; synchronous throw; empty completion. No real sleeps. Confirm cancelled timers do not mutate state.

## Open questions

- Reconcile the entry point with `@rn-forge/ng/crud`, which already uses `rxResource` ([Resource screen](../../../architecture/resource-screen.md)).
