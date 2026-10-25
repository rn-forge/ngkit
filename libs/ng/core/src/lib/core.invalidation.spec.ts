import { httpResource, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { computed, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { injectInvalidation, Invalidation } from './core.invalidation';

type Key = 'a' | 'b';

describe('Invalidation', () => {
  let invalidation: Invalidation<Key>;

  beforeEach(() => {
    invalidation = TestBed.runInInjectionContext(() =>
      injectInvalidation<Key>(),
    );
  });

  it('starts every key at zero and creates it lazily', () => {
    expect(invalidation.version('a')).toBe(0);
  });

  it('increments each key passed, including one never read', () => {
    invalidation.invalidate('a', 'b');
    invalidation.invalidate('a');
    expect(invalidation.version('a')).toBe(2);
    expect(invalidation.version('b')).toBe(1);
  });

  it('leaves other keys unchanged', () => {
    invalidation.version('b');
    invalidation.invalidate('a');
    expect(invalidation.version('b')).toBe(0);
  });

  it('is reactive inside computed', () => {
    const seen = computed(() => invalidation.version('a'));
    expect(seen()).toBe(0);
    invalidation.invalidate('a');
    expect(seen()).toBe(1);
  });

  it('injectInvalidation returns the root instance', () => {
    expect(invalidation).toBe(TestBed.inject(Invalidation));
  });
});

describe('Invalidation with httpResource', () => {
  let http: HttpTestingController;
  let injector: Injector;
  let invalidation: Invalidation<Key>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);
    invalidation = TestBed.runInInjectionContext(() =>
      injectInvalidation<Key>(),
    );
  });

  afterEach(() => http.verify());

  /** An httpResource that reads `version(key)` and fetches `/key`. */
  function reader(key: Key, url = `/${key}`) {
    return httpResource(
      () => {
        invalidation.version(key);
        return url;
      },
      { injector },
    );
  }

  /** Flushes every pending request to `url` and returns how many there were. */
  function flush(url: string): number {
    TestBed.tick();
    const requests = http.match(url);
    for (const request of requests) request.flush({});
    return requests.length;
  }

  it('refetches a reader of the invalidated key once', () => {
    reader('a');
    expect(flush('/a')).toBe(1);
    invalidation.invalidate('a');
    expect(flush('/a')).toBe(1);
  });

  it('does not refetch a reader of another key', () => {
    reader('a');
    expect(flush('/a')).toBe(1);
    invalidation.invalidate('b');
    expect(flush('/a')).toBe(0);
  });

  it('refetches readers of several keys once each in one tick', () => {
    reader('a');
    reader('b');
    flush('/a');
    flush('/b');
    invalidation.invalidate('a', 'b');
    expect(flush('/a')).toBe(1);
    expect(flush('/b')).toBe(1);
  });

  it('refetches every reader of one key', () => {
    reader('a', '/a/1');
    reader('a', '/a/2');
    flush('/a/1');
    flush('/a/2');
    invalidation.invalidate('a');
    expect(flush('/a/1')).toBe(1);
    expect(flush('/a/2')).toBe(1);
  });
});
