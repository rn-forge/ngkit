// external imports
import { httpResource, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  Injector,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  loadingTimings,
  LoadingTimings,
  RNF_LOADING_TIMINGS,
} from './core.loading';
import * as entry from '../index';

// definitions
describe('loadingTimings', () => {
  let loading: ReturnType<typeof signal<boolean>>;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    vi.useFakeTimers();
    loading = signal(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(provided?: LoadingTimings): void {
    TestBed.configureTestingModule({
      providers: provided
        ? [{ provide: RNF_LOADING_TIMINGS, useValue: provided }]
        : [],
    });
    injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );
  }

  function create(options: Partial<LoadingTimings> = {}) {
    return loadingTimings(loading, { injector, ...options });
  }

  function set(value: boolean): void {
    loading.set(value);
    TestBed.tick();
  }

  function advance(ms: number): void {
    vi.advanceTimersByTime(ms);
  }

  describe('without a provided token', () => {
    beforeEach(() => setup());

    it('is false for all three while loading is false', () => {
      const r = create();
      TestBed.tick();
      expect([r.show(), r.slow(), r.stalled()]).toEqual([false, false, false]);
      advance(20000);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([false, false, false]);
    });

    it('turns each signal true at its threshold, and not a tick earlier', () => {
      const r = create();
      set(true);
      advance(299);
      expect(r.show()).toBe(false);
      advance(1);
      expect(r.show()).toBe(true);
      advance(699);
      expect(r.slow()).toBe(false);
      advance(1);
      expect(r.slow()).toBe(true);
      expect(r.show()).toBe(true);
      advance(8999);
      expect(r.stalled()).toBe(false);
      advance(1);
      expect(r.stalled()).toBe(true);
      expect(r.show()).toBe(true);
      expect(r.slow()).toBe(true);
    });

    it('never shows a load that ends before delay', () => {
      const r = create();
      set(true);
      advance(299);
      expect(r.show()).toBe(false);
      set(false);
      advance(20000);
      expect(r.show()).toBe(false);
    });

    it('resets all three at once when a load ends after a threshold', () => {
      const r = create();
      set(true);
      advance(10000);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([true, true, true]);
      set(false);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([false, false, false]);
    });

    it('starts a second load from zero', () => {
      const r = create();
      set(true);
      advance(10000);
      set(false);
      set(true);
      advance(299);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([false, false, false]);
      advance(1);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([true, false, false]);
      advance(700);
      expect(r.slow()).toBe(true);
    });

    it('does not restart the clock while loading stays true', () => {
      const r = create();
      set(true);
      advance(200);
      set(true);
      advance(100);
      expect(r.show()).toBe(true);
    });

    it('clears every threshold timer when loading turns false', () => {
      const r = create();
      set(true);
      advance(100);
      set(false);
      expect(vi.getTimerCount()).toBe(0);
      advance(20000);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([false, false, false]);
    });

    it('clears every pending timer when the injector is destroyed', () => {
      const r = create();
      set(true);
      advance(100);
      injector.destroy();
      expect(vi.getTimerCount()).toBe(0);
      advance(20000);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([false, false, false]);
    });

    it('clears a pending minDuration hold when the injector is destroyed', () => {
      const r = create({ minDuration: 500 });
      set(true);
      advance(400);
      expect(r.show()).toBe(true);
      set(false);
      expect(vi.getTimerCount()).toBe(1);
      injector.destroy();
      expect(vi.getTimerCount()).toBe(0);
      advance(1000);
      expect(r.show()).toBe(true);
    });

    it('turns show false when loading does, with minDuration 0', () => {
      const r = create();
      set(true);
      advance(400);
      set(false);
      expect(r.show()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('holds show true until it has been true for minDuration, then turns it false', () => {
      const r = create({ minDuration: 500 });
      set(true);
      advance(400);
      expect(r.show()).toBe(true);
      set(false);
      expect(r.show()).toBe(true);
      expect(r.slow()).toBe(false);
      expect(r.stalled()).toBe(false);
      advance(399);
      expect(r.show()).toBe(true);
      advance(1);
      expect(r.show()).toBe(false);
    });

    it('turns show false at once when the load ends after minDuration has passed', () => {
      const r = create({ minDuration: 500 });
      set(true);
      advance(900);
      set(false);
      expect(r.show()).toBe(false);
    });

    it('turns slow and stalled false at once while show is held', () => {
      const r = create({
        delay: 100,
        slow: 200,
        stalled: 400,
        minDuration: 2000,
      });
      set(true);
      advance(300);
      expect(r.slow()).toBe(true);
      set(false);
      expect(r.slow()).toBe(false);
      expect(r.stalled()).toBe(false);
      expect(r.show()).toBe(true);
      advance(1799);
      expect(r.show()).toBe(true);
      advance(1);
      expect(r.show()).toBe(false);
    });

    it('keeps show true across a new load during the hold and gives it its own slow clock', () => {
      const r = create({
        delay: 100,
        slow: 200,
        stalled: 400,
        minDuration: 2000,
      });
      set(true);
      advance(150);
      set(false);
      advance(100);
      set(true);
      expect(r.show()).toBe(true);
      expect(vi.getTimerCount()).toBe(2);
      advance(199);
      expect(r.slow()).toBe(false);
      advance(1);
      expect(r.slow()).toBe(true);
      advance(200);
      expect(r.stalled()).toBe(true);
      set(false);
      expect(r.slow()).toBe(false);
      expect(r.stalled()).toBe(false);
      expect(r.show()).toBe(true);
      advance(1449);
      expect(r.show()).toBe(true);
      advance(1);
      expect(r.show()).toBe(false);
    });

    it('has the documented defaults', () => {
      expect(TestBed.inject(RNF_LOADING_TIMINGS)).toEqual({
        delay: 300,
        slow: 1000,
        stalled: 10000,
        minDuration: 0,
      });
    });

    it.each([
      [{ delay: 500, slow: 400 }, ['delay=500', 'slow=400']],
      [{ slow: 20000 }, ['slow=20000', 'stalled=10000']],
      [{ delay: -1 }, ['delay=-1']],
      [{ minDuration: -1 }, ['minDuration=-1']],
      [{ delay: Number.NaN }, ['delay=NaN']],
    ] as [Partial<LoadingTimings>, string[]][])(
      'throws a [rn-forge.ng.core] error for %j',
      (opts, parts) => {
        expect(() => create(opts)).toThrow('[rn-forge.ng.core]');
        try {
          create(opts);
        } catch (e) {
          for (const part of parts) {
            expect((e as Error).message).toContain(part);
          }
        }
      },
    );

    it('accepts equal thresholds', () => {
      const r = create({ delay: 100, slow: 100, stalled: 100 });
      set(true);
      advance(100);
      expect([r.show(), r.slow(), r.stalled()]).toEqual([true, true, true]);
    });

    it('runs in an injection context without an injector option', () => {
      const r = TestBed.runInInjectionContext(() => loadingTimings(loading));
      set(true);
      advance(300);
      expect(r.show()).toBe(true);
    });

    it('throws outside an injection context when no injector is given', () => {
      expect(() => loadingTimings(loading)).toThrow();
    });

    it('returns read-only signals', () => {
      const r = create();
      expect('set' in r.show).toBe(false);
      expect('set' in r.slow).toBe(false);
      expect('set' in r.stalled).toBe(false);
    });

    it('exports the API from the @rn-forge/ng/core entry', () => {
      expect(entry.loadingTimings).toBeDefined();
      expect(entry.RNF_LOADING_TIMINGS).toBeDefined();
    });
  });

  describe('with a provided RNF_LOADING_TIMINGS', () => {
    beforeEach(() =>
      setup({ delay: 50, slow: 60, stalled: 70, minDuration: 0 }),
    );

    it('overrides the defaults with a provided RNF_LOADING_TIMINGS', () => {
      const r = create();
      set(true);
      advance(49);
      expect(r.show()).toBe(false);
      advance(1);
      expect(r.show()).toBe(true);
      advance(10);
      expect(r.slow()).toBe(true);
      expect(r.stalled()).toBe(false);
      advance(10);
      expect(r.stalled()).toBe(true);
    });

    it('overrides the provided timings with per-call options', () => {
      const r = create({ delay: 10 });
      set(true);
      advance(10);
      expect(r.show()).toBe(true);
      expect(r.slow()).toBe(false);
      advance(50);
      expect(r.slow()).toBe(true);
    });
  });
});

describe('loadingTimings over httpResource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(HttpTestingController).verify();
  });

  const settle = async () => {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  };

  function start(url: () => string) {
    const injector = TestBed.inject(Injector);
    const resource = httpResource(url, { injector });
    const timing = loadingTimings(resource.isLoading, { injector });
    return { resource, timing, http: TestBed.inject(HttpTestingController) };
  }

  const advance = (ms: number) => vi.advanceTimersByTime(ms);

  async function runToStalled() {
    const { timing, http } = start(() => '/a');
    await settle();
    const req = http.expectOne('/a');
    advance(299);
    expect(timing.show()).toBe(false);
    advance(1);
    expect(timing.show()).toBe(true);
    expect(timing.slow()).toBe(false);
    advance(699);
    expect(timing.slow()).toBe(false);
    advance(1);
    expect(timing.slow()).toBe(true);
    expect(timing.stalled()).toBe(false);
    advance(8999);
    expect(timing.stalled()).toBe(false);
    advance(1);
    expect(timing.show()).toBe(true);
    expect(timing.slow()).toBe(true);
    expect(timing.stalled()).toBe(true);
    return { timing, req };
  }

  const allFalse = (t: ReturnType<typeof loadingTimings>) => [
    t.show(),
    t.slow(),
    t.stalled(),
  ];

  it('never shows a request flushed before delay', async () => {
    const { timing, http } = start(() => '/a');
    await settle();
    advance(299);
    http.expectOne('/a').flush({});
    await settle();
    advance(5000);
    expect(allFalse(timing)).toEqual([false, false, false]);
  });

  it('sets each signal at its threshold and resets all on flush', async () => {
    const { timing, req } = await runToStalled();
    req.flush({});
    await settle();
    expect(allFalse(timing)).toEqual([false, false, false]);
  });

  it('resets all three on an error response', async () => {
    const { timing, req } = await runToStalled();
    req.flush('x', { status: 500, statusText: 'Server Error' });
    await settle();
    expect(allFalse(timing)).toEqual([false, false, false]);
  });

  it('keeps the clock running when the request changes while pending', async () => {
    const id = signal('a');
    const { resource, timing, http } = start(() => '/r' + id());
    await settle();
    advance(200);
    id.set('b');
    await settle();
    expect(resource.isLoading()).toBe(true);
    expect(allFalse(timing)).toEqual([false, false, false]);
    const [first, second] = http.match(() => true);
    expect(first.cancelled).toBe(true);
    expect(second.cancelled).toBe(false);
    advance(99);
    expect(timing.show()).toBe(false);
    advance(1);
    expect(timing.show()).toBe(true);
    advance(700);
    expect(timing.slow()).toBe(true);
    second.flush({});
    await settle();
    expect(allFalse(timing)).toEqual([false, false, false]);
  });
});
