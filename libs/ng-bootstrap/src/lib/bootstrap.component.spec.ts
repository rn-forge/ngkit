import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { cloneDeep } from 'lodash-es';
import { ObjectUtil } from '@rn-forge/ng/core';
import {
  ConfigurableComponent,
  ConfigurerService,
} from './bootstrap.component';
import { RN_FORGE_BOOTSTRAP_CONFIG_TOKEN } from './bootstrap.config';

type ProbeOptions = {
  list?: number[];
  items?: { a: number; fn?: () => void }[];
  n?: { x?: number; y?: number };
  s?: string;
  cb?: () => void;
};

const probe = { hookCalls: 0, defaultsCalls: 0, mutateItems: false };

@Component({ selector: 'rnf-config-probe', template: '' })
class ConfigProbeComponent extends ConfigurableComponent<ProbeOptions> {
  configKey = 'tt';

  override defaultOptions(): Partial<ProbeOptions> {
    probe.defaultsCalls++;
    return {
      list: [1, 2, 3, 4],
      items: [{ a: 1 }, { a: 2 }],
      n: { x: 1, y: 2 },
    };
  }

  override configureOptions(c: Partial<ProbeOptions>): void {
    probe.hookCalls++;
    c.s ??= 'hooked';
    if (probe.mutateItems) c.items?.forEach((i) => (i.a = 99));
  }
}

const GLOBAL = { tt: { n: { y: 9 } } };

type Caches = {
  inputsCache: Record<string, unknown>;
  overridesCache: Record<string, unknown>;
  finalOptionsCache: Record<string, unknown>;
};

function create(
  options?: ProbeOptions,
): ComponentFixture<ConfigProbeComponent> {
  const fixture = TestBed.createComponent(ConfigProbeComponent);
  if (options) fixture.componentRef.setInput('options', options);
  return fixture;
}

describe('ConfigurableComponent option resolution', () => {
  beforeEach(() => {
    probe.hookCalls = 0;
    probe.defaultsCalls = 0;
    probe.mutateItems = false;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RN_FORGE_BOOTSTRAP_CONFIG_TOKEN,
          useValue: cloneDeep(GLOBAL),
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('A. precedence', () => {
    it('resolves defaults plus global config', () => {
      const c = create().componentInstance;
      expect(c.config.n).toEqual({ x: 1, y: 9 });
      expect(c.config.list).toEqual([1, 2, 3, 4]);
      expect(c.config.s).toBe('hooked');
    });

    it('lets the input win over global config', () => {
      const c = create({ n: { y: 5 } }).componentInstance;
      expect(c.config.n).toEqual({ x: 1, y: 5 });
    });

    it('lets an override win over the input and clearOverrides restore it', () => {
      const c = create({ n: { x: 3 } }).componentInstance;
      c.updateOptions({ n: { x: 5 } });
      expect(c.config.n).toEqual({ x: 5, y: 9 });
      c.clearOverrides();
      expect(c.config.n).toEqual({ x: 3, y: 9 });
    });

    it('does not let an input leaf undefined override a default', () => {
      const c = create({ n: { x: undefined } }).componentInstance;
      expect(c.config.n?.x).toBe(1);
    });
  });

  describe('B. arrays merge by index', () => {
    it('merges input arrays element-wise', () => {
      expect(create({ list: [9, 8] }).componentInstance.config.list).toEqual([
        9, 8, 3, 4,
      ]);
      expect(create({ list: [] }).componentInstance.config.list).toEqual([
        1, 2, 3, 4,
      ]);
      expect(
        create({ list: [1, 2, 3, 4, 5] }).componentInstance.config.list,
      ).toEqual([1, 2, 3, 4, 5]);
      expect(
        create({ items: [{ a: 10 }] }).componentInstance.config.items,
      ).toEqual([{ a: 10 }, { a: 2 }]);
    });

    it('merges override arrays element-wise', () => {
      const c = create().componentInstance;
      c.updateOptions({ list: [7] });
      expect(c.config.list).toEqual([7, 2, 3, 4]);
      c.updateOptions({ list: [] });
      expect(c.config.list).toEqual([1, 2, 3, 4]);
    });

    it('replaces arrays when accumulating overrides with mergeOptions', () => {
      const c = create().componentInstance;
      c.updateOptions({ list: [7, 7, 7] });
      c.mergeOptions({ list: [5, 6] });
      expect(c.config.list).toEqual([5, 6, 3, 4]);
      c.mergeOptions({ list: [] });
      expect(c.config.list).toEqual([1, 2, 3, 4]);
    });
  });

  describe('C. override semantics', () => {
    it('updateOptions replaces the whole override set', () => {
      const c = create().componentInstance;
      c.updateOptions({ list: [7] });
      c.updateOptions({ n: { x: 5 } });
      expect(c.config.list).toEqual([1, 2, 3, 4]);
      expect(c.config.n).toEqual({ x: 5, y: 9 });
    });

    it('mergeOptions accumulates', () => {
      const c = create().componentInstance;
      c.mergeOptions({ n: { x: 5 } });
      c.mergeOptions({ n: { y: 6 } });
      expect(c.config.n).toEqual({ x: 5, y: 6 });
    });

    it('updateOptions(undefined) is a no-op', () => {
      const c = create().componentInstance;
      c.updateOptions({ n: { x: 5 } });
      c.updateOptions(undefined);
      expect(c.config.n?.x).toBe(5);
    });

    it('clearOverrides removes every override', () => {
      const c = create().componentInstance;
      c.updateOptions({ n: { x: 5 }, list: [7] });
      c.clearOverrides();
      expect(c.config.n).toEqual({ x: 1, y: 9 });
      expect(c.config.list).toEqual([1, 2, 3, 4]);
    });
  });

  describe('D. callbacks', () => {
    it('keeps callback identity', () => {
      const cb = () => 1;
      const fn = () => 2;
      const c = create({ cb, items: [{ a: 1, fn }] }).componentInstance;
      expect(c.config.cb).toBe(cb);
      expect(c.config.items?.[0].fn).toBe(fn);
      const cb2 = () => 3;
      c.mergeOptions({ cb: cb2, s: 'y' });
      expect(c.config.cb).toBe(cb2);
    });

    it('picks up a replaced callback together with another change', () => {
      const cb1 = () => 1;
      const cb2 = () => 2;
      const fixture = create({ cb: cb1 });
      const c = fixture.componentInstance;
      expect(c.config.cb).toBe(cb1);
      fixture.componentRef.setInput('options', { cb: cb2, s: 'x' });
      expect(c.config.cb).toBe(cb2);
      expect(c.config.s).toBe('x');
    });
  });

  describe('E. hook', () => {
    it('runs once per recompute with the merged object', () => {
      const fixture = create({ n: { x: 3 } });
      const c = fixture.componentInstance;
      expect(c.config.n).toEqual({ x: 3, y: 9 });
      expect(probe.hookCalls).toBe(1);
      expect(c.config).toBe(c.config);
      expect(probe.hookCalls).toBe(1);

      fixture.componentRef.setInput('options', { n: { x: 3 } });
      expect(c.config).toBeDefined(); // read to resolve
      expect(probe.hookCalls).toBe(1);

      fixture.componentRef.setInput('options', { n: { x: 4 } });
      expect(c.config.n).toEqual({ x: 4, y: 9 });
      expect(probe.hookCalls).toBe(2);

      c.updateOptions({ list: [7] });
      expect(c.config.list).toEqual([7, 2, 3, 4]);
      expect(probe.hookCalls).toBe(3);
    });

    it('keeps what the hook adds out of the input and override objects', () => {
      const input: ProbeOptions = { n: { x: 3 } };
      const override: ProbeOptions = { list: [7] };
      const c = create(input).componentInstance;
      c.updateOptions(override);
      expect(c.config.s).toBe('hooked');
      expect(input).toEqual({ n: { x: 3 } });
      expect(override).toEqual({ list: [7] });
    });
  });

  describe('F. immutability and aliasing', () => {
    it('does not mutate inputs, overrides, global config or defaults', () => {
      probe.mutateItems = true;
      const input: ProbeOptions = { items: [{ a: 5 }], n: { x: 3 } };
      const override: ProbeOptions = { items: [{ a: 6 }] };
      const inputSnapshot = cloneDeep(input);
      const overrideSnapshot = cloneDeep(override);
      const c = create(input).componentInstance;
      c.updateOptions(override);
      expect(c.config.items?.[0].a).toBe(99);
      expect(input).toEqual(inputSnapshot);
      expect(override).toEqual(overrideSnapshot);
      expect(TestBed.inject(RN_FORGE_BOOTSTRAP_CONFIG_TOKEN)).toEqual(GLOBAL);

      probe.mutateItems = false;
      const other = create({ n: { x: 1 } }).componentInstance;
      expect(other.config.items).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('detects a new input object with a changed leaf', () => {
      const fixture = create({ n: { x: 3 } });
      const c = fixture.componentInstance;
      expect(c.config.n?.x).toBe(3);
      fixture.componentRef.setInput('options', { n: { x: 4 } });
      expect(c.config.n?.x).toBe(4);
    });

    it('does not detect an in-place mutation (documented limitation)', () => {
      const input: ProbeOptions = { n: { x: 3 } };
      const fixture = create(input);
      const c = fixture.componentInstance;
      expect(c.config.n?.x).toBe(3);
      input.n = { x: 4 };
      fixture.componentRef.setInput('options', input);
      expect(c.config.n?.x).toBe(3);
    });
  });

  describe('G. instances and destroy', () => {
    it('resolves instances independently and runs defaults once per key', () => {
      const f1 = create({ n: { x: 3 } });
      const f2 = create({ n: { x: 4 } });
      f1.componentInstance.updateOptions({ list: [7] });
      expect(f1.componentInstance.config.n?.x).toBe(3);
      expect(f1.componentInstance.config.list).toEqual([7, 2, 3, 4]);
      expect(f2.componentInstance.config.n?.x).toBe(4);
      expect(f2.componentInstance.config.list).toEqual([1, 2, 3, 4]);
      expect(probe.defaultsCalls).toBe(1);
    });

    it('releases per-instance caches on destroy and leaves others alone', () => {
      const f1 = create({ n: { x: 3 } });
      const f2 = create({ n: { x: 4 } });
      const c1 = f1.componentInstance;
      const c2 = f2.componentInstance;
      c1.updateOptions({ list: [7] });
      c2.updateOptions({ list: [8] });
      expect(c1.config).toBeDefined(); // read to resolve
      expect(c2.config).toBeDefined(); // read to resolve
      const caches = TestBed.inject(ConfigurerService) as unknown as Caches;
      const id1 = c1.instanceId;
      const id2 = c2.instanceId;
      const before2 = c2.config;

      f1.destroy();
      expect(id1 in caches.inputsCache).toBe(false);
      expect(id1 in caches.overridesCache).toBe(false);
      expect(id1 in caches.finalOptionsCache).toBe(false);
      expect(id2 in caches.inputsCache).toBe(true);
      expect(id2 in caches.overridesCache).toBe(true);
      expect(id2 in caches.finalOptionsCache).toBe(true);
      expect(c2.config).toBe(before2);

      c2.updateOptions({ list: [9] });
      expect(c2.config.list).toEqual([9, 2, 3, 4]);
    });
  });

  describe('H. operation counts', () => {
    let top = 0;
    let depth = 0;
    let sameRef = 0;

    function install(): void {
      const original = ObjectUtil.diff.bind(ObjectUtil);
      vi.spyOn(ObjectUtil, 'diff').mockImplementation((a, b) => {
        if (depth === 0) {
          top++;
          if (a === b) sameRef++;
        }
        depth++;
        try {
          return original(a, b);
        } finally {
          depth--;
        }
      });
    }

    function reset(): void {
      top = 0;
      depth = 0;
      sameRef = 0;
    }

    let fixture: ComponentFixture<ConfigProbeComponent>;
    let c: ConfigProbeComponent;

    beforeEach(() => {
      fixture = create({ n: { x: 3 } });
      c = fixture.componentInstance;
      c.updateOptions({ list: [7] });
      expect(c.config).toBeDefined(); // read to resolve
      install();
      reset();
    });

    it('H1. an unchanged read runs no diff', () => {
      expect(c.config).toBeDefined(); // read to resolve
      expect(c.config).toBeDefined(); // read to resolve
      expect(top).toBe(0);
    });

    it('H2. a new input object with equal content runs one diff', () => {
      const before = c.config;
      const hooks = probe.hookCalls;
      fixture.componentRef.setInput('options', { n: { x: 3 } });
      expect(c.config).toBe(before);
      expect(top).toBe(1);
      expect(sameRef).toBe(0);
      expect(probe.hookCalls).toBe(hooks);
    });

    it('H3. a second updateOptions with equal content runs one diff', () => {
      const before = c.config;
      const hooks = probe.hookCalls;
      c.updateOptions({ list: [7] });
      expect(c.config).toBe(before);
      expect(top).toBe(1);
      expect(sameRef).toBe(0);
      expect(probe.hookCalls).toBe(hooks);
    });

    it('H4. updateOptions with a changed leaf runs two diffs', () => {
      const before = c.config;
      const hooks = probe.hookCalls;
      c.updateOptions({ list: [8] });
      const after = c.config;
      expect(after).not.toBe(before);
      expect(after.list).toEqual([8, 2, 3, 4]);
      expect(top).toBe(2);
      expect(sameRef).toBe(0);
      expect(probe.hookCalls).toBe(hooks + 1);
    });

    it('H5. no diff call has the same reference on both sides', () => {
      fixture.componentRef.setInput('options', { n: { x: 3 } });
      expect(c.config).toBeDefined(); // read to resolve
      c.updateOptions({ list: [7] });
      expect(c.config).toBeDefined(); // read to resolve
      c.updateOptions({ list: [8] });
      expect(c.config).toBeDefined(); // read to resolve
      expect(sameRef).toBe(0);
    });

    it('H6. signal invalidation follows content, not identity', () => {
      const first = c.config;
      const hooks = probe.hookCalls;
      fixture.componentRef.setInput('options', { n: { x: 3 } });
      expect(c.config).toBe(first);
      c.updateOptions({ list: [7] });
      expect(c.config).toBe(first);
      expect(probe.hookCalls).toBe(hooks);
      c.updateOptions({ list: [8] });
      expect(c.config).not.toBe(first);
      expect(probe.hookCalls).toBe(hooks + 1);
    });
  });
});
