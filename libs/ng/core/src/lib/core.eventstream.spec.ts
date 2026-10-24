import {
  createEnvironmentInjector,
  EnvironmentInjector,
  ErrorHandler,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  createEventStream,
  EventStreamOptions,
  RNF_EVENT_SOURCE_FACTORY,
} from './core.eventstream';

/** Minimal EventSource stand-in: tests drive readyState and dispatch events. */
class FakeEventSource extends EventTarget {
  static readonly instances: FakeEventSource[] = [];
  readyState = 0;
  closeCalls = 0;

  constructor(
    readonly url: string,
    readonly init: EventSourceInit,
  ) {
    super();
    FakeEventSource.instances.push(this);
  }

  close(): void {
    this.closeCalls++;
    this.readyState = 2;
  }

  open(): void {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }

  fail(readyState: 0 | 2): void {
    this.readyState = readyState;
    this.dispatchEvent(new Event('error'));
  }

  emit(name: string, data: string): void {
    this.dispatchEvent(new MessageEvent(name, { data }));
  }
}

const latest = () => FakeEventSource.instances.at(-1) as FakeEventSource;

describe('createEventStream', () => {
  let handleError: ReturnType<typeof vi.fn>;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    handleError = vi.fn();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RNF_EVENT_SOURCE_FACTORY,
          useValue: (url: string, init: EventSourceInit) =>
            new FakeEventSource(url, init) as unknown as EventSource,
        },
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function stream(options: Partial<EventStreamOptions> = {}) {
    return createEventStream({
      url: '/events',
      events: {},
      injector,
      ...options,
    });
  }

  it('runs in an injection context without an injector', () => {
    const s = TestBed.runInInjectionContext(() =>
      createEventStream({ url: '/events', events: {} }),
    );
    expect(s.source()).toBe(latest());
  });

  it('opens one source with the url and credentials', () => {
    const s = stream({ withCredentials: true });
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latest().url).toBe('/events');
    expect(latest().init).toEqual({ withCredentials: true });
    expect(s.source()).toBe(latest());
  });

  it('delivers a named event to its handler once and ignores unknown names', () => {
    const status = vi.fn();
    stream({ events: { status } });
    latest().emit('status', '{"ok":true}');
    latest().emit('other', 'x');
    expect(status).toHaveBeenCalledTimes(1);
    expect(status.mock.calls[0][0].data).toBe('{"ok":true}');
  });

  it('reports a throwing handler to ErrorHandler and stays open', () => {
    const boom = new Error('boom');
    const ok = vi.fn();
    const s = stream({
      events: {
        status: () => {
          throw boom;
        },
        ok,
      },
    });
    latest().open();
    latest().emit('status', '');
    latest().emit('ok', '');
    expect(handleError).toHaveBeenCalledWith(boom);
    expect(ok).toHaveBeenCalled();
    expect(s.connected()).toBe(true);
    expect(latest().closeCalls).toBe(0);
  });

  describe('connected', () => {
    it('follows open, error in either readyState, and close', () => {
      const s = stream();
      expect(s.connected()).toBe(false);
      latest().open();
      expect(s.connected()).toBe(true);
      latest().fail(0);
      expect(s.connected()).toBe(false);
      latest().open();
      latest().fail(2);
      expect(s.connected()).toBe(false);
      vi.runOnlyPendingTimers();
      latest().open();
      s.close();
      expect(s.connected()).toBe(false);
    });
  });

  describe('reconnection', () => {
    it('leaves the browser to retry while CONNECTING', () => {
      const s = stream();
      const first = latest();
      first.fail(0);
      vi.runAllTimers();
      expect(first.closeCalls).toBe(0);
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(s.source()).toBe(first);
    });

    it('opens a new source after a jittered exponential delay once CLOSED', () => {
      let n = 0;
      const s = stream({ url: () => `/events?n=${n++}` });
      // Math.random() = 0: each delay is the lower bound, cap / 2.
      const expected = [500, 1000, 2000, 4000, 8000, 15000, 15000];
      for (const delay of expected) {
        latest().fail(2);
        expect(s.source()).toBeNull();
        const count = FakeEventSource.instances.length;
        vi.advanceTimersByTime(delay - 1);
        expect(FakeEventSource.instances).toHaveLength(count);
        vi.advanceTimersByTime(1);
        expect(FakeEventSource.instances).toHaveLength(count + 1);
      }
      expect(latest().url).toBe(`/events?n=${expected.length}`);
      expect(s.source()).toBe(latest());
    });

    it('keeps the delay within [cap / 2, cap]', () => {
      vi.mocked(Math.random).mockReturnValue(0.999);
      stream({ backoff: { baseMs: 100, maxMs: 1000 } });
      latest().fail(2);
      // cap 100, random 0.999: 50 + 49.95, just under the cap.
      vi.advanceTimersByTime(98);
      expect(FakeEventSource.instances).toHaveLength(1);
      vi.advanceTimersByTime(2);
      expect(FakeEventSource.instances).toHaveLength(2);
    });

    it('resets the attempt count on open', () => {
      stream();
      latest().fail(2);
      vi.advanceTimersByTime(500);
      latest().fail(2);
      vi.advanceTimersByTime(1000);
      latest().open();
      latest().fail(2);
      vi.advanceTimersByTime(500);
      expect(FakeEventSource.instances).toHaveLength(4);
    });

    it('opens nothing after close, and clears a pending timer', () => {
      const s = stream();
      latest().fail(2);
      s.close();
      vi.runAllTimers();
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('teardown', () => {
    it('closes the source when the injector is destroyed', () => {
      const s = stream();
      const es = latest();
      injector.destroy();
      expect(es.closeCalls).toBe(1);
      expect(s.source()).toBeNull();
      s.close();
      expect(es.closeCalls).toBe(1);
    });

    it('clears a pending timer on destroy', () => {
      stream();
      latest().fail(2);
      injector.destroy();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('is safe to close twice', () => {
      const s = stream();
      s.close();
      s.close();
      expect(latest().closeCalls).toBe(1);
    });
  });

  describe('inert without EventSource', () => {
    it('opens and schedules nothing', () => {
      const s = createEventStream({
        url: '/events',
        events: {},
        injector: createEnvironmentInjector(
          [{ provide: RNF_EVENT_SOURCE_FACTORY, useValue: null }],
          injector,
        ),
      });
      expect(s.source()).toBeNull();
      expect(s.connected()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      expect(() => s.close()).not.toThrow();
    });
  });

  it('defaults the factory to null where EventSource is absent', () => {
    TestBed.resetTestingModule();
    const factory = TestBed.inject(RNF_EVENT_SOURCE_FACTORY);
    expect(factory === null).toBe(typeof EventSource === 'undefined');
  });
});
