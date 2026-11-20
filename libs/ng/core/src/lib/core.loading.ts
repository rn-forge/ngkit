// external imports
import {
  assertInInjectionContext,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  Injector,
  Signal,
  signal,
  untracked,
} from '@angular/core';

// definitions
export interface LoadingTimings {
  /** ms of loading before `show` turns true. */
  readonly delay: number;
  /** ms of loading before `slow` turns true. */
  readonly slow: number;
  /** ms of loading before `stalled` turns true. */
  readonly stalled: number;
  /** ms `show` stays true once it turned true, even after `loading` is false. */
  readonly minDuration: number;
}

export interface LoadingState {
  /** True once the current load has lasted `delay`; a load that ends sooner never shows. */
  readonly show: Signal<boolean>;
  readonly slow: Signal<boolean>;
  readonly stalled: Signal<boolean>;
}

/** Application-wide defaults; provide it to change them. */
export const RNF_LOADING_TIMINGS = new InjectionToken<LoadingTimings>(
  'RnForgeLoadingTimings',
  {
    providedIn: 'root',
    factory: () => ({
      delay: 300,
      slow: 1000,
      stalled: 10_000,
      minDuration: 0,
    }),
  },
);

/**
 * Turns one loading signal into three: `show` (true once a load has lasted
 * `delay`, so a fast load never flashes a skeleton), `slow` and `stalled`
 * (true once it has lasted `slow` and `stalled`). A load starts when `loading`
 * turns true and ends when it turns false; staying true does not restart the
 * clock. With `minDuration` above 0, `show` stays true until it has been true
 * for that long in total; `slow` and `stalled` turn false when the load ends.
 * A load that starts during the hold keeps `show` true and runs its own
 * `slow` and `stalled` clocks.
 *
 * Per-call options override `RNF_LOADING_TIMINGS`, which overrides the
 * defaults (300, 1000, 10000, 0). It runs in an injection context or takes
 * `injector`, reads only the boolean, and clears its timers on destroy. Invalid
 * timings throw an `Error` prefixed `[rn-forge.ng.core]`.
 *
 * Hand-rolled under ADR-0001 exemption 3 (the needed slice is a few lines,
 * and the candidates are unmaintained or much heavier). npm checked
 * 2026-10-24: nothing maintained covers a resource-signal-based delay, hold,
 * slow and stalled state. `ngxtension` 7.3.1 `derive-loading` is an RxJS
 * operator with no slow or stalled state, and would add `ngxtension` and a
 * peer for one operator; `spin-delay` 2.0.1 is a React hook; `@ngneat/loadoff`
 * 2.1.0 is RxJS-based and was last published 2024-08.
 */
export function loadingTimings(
  loading: Signal<boolean>,
  options: Partial<LoadingTimings> & { readonly injector?: Injector } = {},
): LoadingState {
  if (!options.injector) assertInInjectionContext(loadingTimings);
  const injector = options.injector ?? inject(Injector);

  const { injector: _injector, ...rest } = options;
  const defined = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  );
  const t: LoadingTimings = {
    ...injector.get(RNF_LOADING_TIMINGS),
    ...defined,
  };
  if (
    !(0 <= t.delay && t.delay <= t.slow && t.slow <= t.stalled) ||
    !(t.minDuration >= 0)
  ) {
    throw new Error(
      `[rn-forge.ng.core] loadingTimings needs 0 <= delay <= slow <= stalled and minDuration >= 0; got delay=${t.delay}, slow=${t.slow}, stalled=${t.stalled}, minDuration=${t.minDuration}`,
    );
  }

  const show = signal(false);
  const slow = signal(false);
  const stalled = signal(false);
  type Timer = ReturnType<typeof setTimeout>;
  let showTimer: Timer | undefined;
  let slowTimer: Timer | undefined;
  let stalledTimer: Timer | undefined;
  let holdTimer: Timer | undefined;
  let showSince = 0;
  let active = false;
  let destroyed = false;

  const clearAll = (): void => {
    clearTimeout(showTimer);
    clearTimeout(slowTimer);
    clearTimeout(stalledTimer);
    clearTimeout(holdTimer);
    showTimer = slowTimer = stalledTimer = holdTimer = undefined;
  };

  const start = (): void => {
    clearTimeout(holdTimer);
    holdTimer = undefined;
    if (!show()) {
      showTimer = setTimeout(() => {
        showSince = Date.now();
        show.set(true);
      }, t.delay);
    }
    slowTimer = setTimeout(() => slow.set(true), t.slow);
    stalledTimer = setTimeout(() => stalled.set(true), t.stalled);
  };

  const end = (): void => {
    clearAll();
    slow.set(false);
    stalled.set(false);
    if (!show()) return;
    const remaining = t.minDuration - (Date.now() - showSince);
    if (remaining > 0) {
      holdTimer = setTimeout(() => show.set(false), remaining);
    } else {
      show.set(false);
    }
  };

  injector.get(DestroyRef).onDestroy(() => {
    destroyed = true;
    clearAll();
  });

  effect(
    () => {
      const on = loading();
      untracked(() => {
        if (destroyed || on === active) return;
        active = on;
        if (on) start();
        else end();
      });
    },
    { injector },
  );

  return {
    show: show.asReadonly(),
    slow: slow.asReadonly(),
    stalled: stalled.asReadonly(),
  };
}
