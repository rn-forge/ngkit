// external imports
import { inject, Injectable, signal, WritableSignal } from '@angular/core';

// definitions
/**
 * The shared refetch trigger for `httpResource` readers of one kind of data.
 * A reader reads `version(key)` inside its request function; a writer calls
 * `invalidate(key)` after a mutation, and every reader of that key refetches.
 *
 * It does not fetch, cache or deduplicate: `httpResource` does the fetching
 * and this is only the shared signal (ADR-0001 exemption 3: a hand-rolled few
 * lines over the framework's own trigger). Obtain it through
 * {@link injectInvalidation}, which carries the application's key union.
 */
@Injectable({ providedIn: 'root' })
export class Invalidation<$Key extends string = string> {
  private readonly versions = new Map<$Key, WritableSignal<number>>();

  /** One counter per key, created on first read. Read it inside a request function. */
  version(key: $Key): number {
    return this.counter(key)();
  }

  /** Increment each key's counter, so every resource that read `version(key)` refetches. */
  invalidate(...keys: $Key[]): void {
    for (const key of keys) this.counter(key).update((v) => v + 1);
  }

  private counter(key: $Key): WritableSignal<number> {
    let counter = this.versions.get(key);
    if (!counter) {
      counter = signal(0);
      this.versions.set(key, counter);
    }
    return counter;
  }
}

/**
 * The root {@link Invalidation}, typed with the application's key union.
 * Runs in an injection context. A root-provided generic class loses its type
 * argument at `inject()`, so the key union is given here instead.
 */
export function injectInvalidation<$Key extends string>(): Invalidation<$Key> {
  return inject(Invalidation) as Invalidation<$Key>;
}
