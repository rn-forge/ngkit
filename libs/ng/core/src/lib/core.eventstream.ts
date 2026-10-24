// external imports
import {
  assertInInjectionContext,
  DestroyRef,
  ErrorHandler,
  inject,
  InjectionToken,
  Injector,
  Signal,
  signal,
} from '@angular/core';

// definitions
/** Opens an `EventSource`; `null` where there is none (SSR, old runtimes). */
export const RNF_EVENT_SOURCE_FACTORY = new InjectionToken<
  ((url: string, init: EventSourceInit) => EventSource) | null
>('RnForgeEventSourceFactory', {
  providedIn: 'root',
  factory: () =>
    typeof EventSource === 'undefined'
      ? null
      : (url, init) => new EventSource(url, init),
});

export interface EventStreamOptions {
  /** URL, or a function read each time a new source is opened. */
  readonly url: string | (() => string);
  /** Handlers keyed by SSE event name; each receives the raw MessageEvent. */
  readonly events: Readonly<
    Record<string, (event: MessageEvent<string>) => void>
  >;
  /** Delay before opening a new source after the browser fails the connection. */
  readonly backoff?: { readonly baseMs?: number; readonly maxMs?: number };
  readonly withCredentials?: boolean;
  readonly injector?: Injector;
}

export interface EventStream {
  readonly connected: Signal<boolean>;
  /** The underlying source, as an escape hatch; `null` when inert or between sources. */
  readonly source: Signal<EventSource | null>;
  /** Closes the source and stops reconnecting. Idempotent. */
  close(): void;
}

const DEFAULT_BASE_MS = 1000;
const DEFAULT_MAX_MS = 30_000;
/** `EventSource.CLOSED`, spelled out so the inert path never touches the global. */
const CLOSED = 2;

/**
 * One server-sent event stream over the browser's `EventSource`, with named
 * handlers, a `connected` signal and teardown through `DestroyRef`.
 *
 * Reconnection is the standard's: while `readyState` is `CONNECTING` the
 * browser retries by itself, honouring `retry:` and sending `Last-Event-ID`,
 * and this wrapper leaves it alone. Only when the browser fails the
 * connection (`readyState` `CLOSED`, e.g. a proxy's 502) does it open a new
 * source, after `min(baseMs * 2^attempt, maxMs)` with equal jitter.
 *
 * Handlers own parsing (`JSON.parse`); a throwing handler is reported to
 * `ErrorHandler` and the stream stays open. With no `EventSource` (the
 * factory is `null`, as on the server) the stream is inert.
 *
 * Hand-rolled (ADR-0001): Angular has no `EventSource` wrapper and
 * `httpResource` is request-response. `reconnecting-eventsource` (1.6.5,
 * npm checked 2026-10-24) leaves `CONNECTING` alone, but waits a uniform
 * random delay with no backoff and resumes through a `lastEventId` query
 * parameter instead of the standard header, and still needs the signals,
 * teardown and `ErrorHandler` routing written here.
 */
export function createEventStream(options: EventStreamOptions): EventStream {
  if (!options.injector) assertInInjectionContext(createEventStream);
  const injector = options.injector ?? inject(Injector);
  const factory = injector.get(RNF_EVENT_SOURCE_FACTORY);
  const errorHandler = injector.get(ErrorHandler);
  const baseMs = options.backoff?.baseMs ?? DEFAULT_BASE_MS;
  const maxMs = options.backoff?.maxMs ?? DEFAULT_MAX_MS;

  const connected = signal(false);
  const source = signal<EventSource | null>(null);
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = (create: NonNullable<typeof factory>): void => {
    const url = typeof options.url === 'function' ? options.url() : options.url;
    const es = create(url, { withCredentials: options.withCredentials });
    es.addEventListener('open', () => {
      attempt = 0;
      connected.set(true);
    });
    es.addEventListener('error', () => {
      connected.set(false);
      if (es.readyState !== CLOSED || closed) return;
      es.close();
      source.set(null);
      const cap = Math.min(baseMs * 2 ** attempt, maxMs);
      attempt++;
      timer = setTimeout(
        () => open(create),
        cap / 2 + Math.random() * (cap / 2),
      );
    });
    for (const [name, handler] of Object.entries(options.events)) {
      es.addEventListener(name, (event) => {
        try {
          handler(event as MessageEvent<string>);
        } catch (error) {
          errorHandler.handleError(error);
        }
      });
    }
    source.set(es);
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    source()?.close();
    source.set(null);
    connected.set(false);
  };

  injector.get(DestroyRef).onDestroy(close);
  if (factory) open(factory);

  return {
    connected: connected.asReadonly(),
    source: source.asReadonly(),
    close,
  };
}
