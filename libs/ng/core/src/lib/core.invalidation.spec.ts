import { computed } from '@angular/core';
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
