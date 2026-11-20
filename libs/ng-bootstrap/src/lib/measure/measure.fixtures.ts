/**
 * Shared fixtures for the option-resolution measurement harness (S19.3.2).
 *
 * The two `*.measure.spec.ts` files in this directory run only when the
 * `NGKIT_MEASURE` environment variable is set; this file holds the option
 * builders, the workload definitions and the statistics helpers they share. It
 * is not a spec and uses no vitest globals and no `process`.
 */

export type Size = 'S' | 'M' | 'L';
export type Widget = 'table' | 'form';
export type Options = Record<string, unknown>;

export const SIZES: readonly Size[] = ['S', 'M', 'L'];
export const WIDGETS: readonly Widget[] = ['table', 'form'];

const DIMENSIONS: Record<
  Size,
  { columns: number; buttons: number; controls: number }
> = {
  S: { columns: 5, buttons: 2, controls: 4 },
  M: { columns: 20, buttons: 6, controls: 15 },
  L: { columns: 80, buttons: 20, controls: 60 },
};

/** Table options: columns with formatter callbacks, buttons, nested `icons`, arrays. */
function tableOptions(size: Size, tweak: number): Options {
  const { columns, buttons } = DIMENSIONS[size];
  return {
    pageSize: 5 + tweak,
    pageList: [5, 10, 20, 100],
    icons: { refresh: 'bi-arrow', toggle: 'bi-list', columns: 'bi-cols' },
    columns: Array.from({ length: columns }, (_, i) => ({
      field: `field${i}`,
      title: `Title ${i}`,
      sortable: i % 2 === 0,
      align: 'left',
      visible: true,
      formatter: (value: unknown) => `${String(value)}-${i}`,
    })),
    toolbarButtons: Array.from({ length: buttons }, (_, i) => ({
      label: `Button ${i}`,
      icon: `bi-${i}`,
      class: 'primary',
      linkToRow: i % 3 === 1,
      callback: () => i,
    })),
  };
}

/** Form options: controls as `[value, validator]` tuples, nested `contextParams`. */
function formOptions(size: Size, tweak: number): Options {
  const { controls } = DIMENSIONS[size];
  return {
    header: `Header ${tweak}`,
    layout: 'vertical',
    submitBtn: 'Save',
    cancelBtn: 'Cancel',
    contextParams: { mode: 'add', owner: 'measure' },
    controls: Object.fromEntries(
      Array.from({ length: controls }, (_, i) => [
        `control${i}`,
        ['', () => null],
      ]),
    ),
  };
}

/** A fresh, equal-content options object per call; `tweak` changes one leaf. */
export function buildOptions(widget: Widget, size: Size, tweak = 0): Options {
  return widget === 'table'
    ? tableOptions(size, tweak)
    : formOptions(size, tweak);
}

/** Runtime overrides: unchanged content, one changed leaf, or a replaced array. */
export function buildOverrides(
  widget: Widget,
  kind: 'same' | 'leaf' | 'array',
  i: number,
): Options {
  if (widget === 'table') {
    if (kind === 'same') return { pageSize: 10, icons: { refresh: 'bi-x' } };
    if (kind === 'leaf') return { pageSize: 10 + i };
    return { pageList: [5, 10, 20, 100 + i] };
  }
  if (kind === 'same') return { header: 'Override', contextParams: { a: 1 } };
  if (kind === 'leaf') return { header: `Override ${i}` };
  return { controls: { control0: [`value${i}`, () => null] } };
}

/** Counts leaves: every value that is neither a plain object nor an array. */
export function leafCount(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((sum: number, v) => sum + leafCount(v), 0);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).reduce(
      (sum: number, v) => sum + leafCount(v),
      0,
    );
  }
  return 1;
}

export interface Instance {
  readonly component: object;
  destroy(): void;
}

export interface CacheSizes {
  inputs: number;
  overrides: number;
  finals: number;
}

/** What a workload needs from the Angular test rig (built in each spec file). */
export interface Rig {
  /** Replaces the host binding `[options]="build()"`. */
  bind(build: () => Options): void;
  detect(): void;
  /** Reads `component.config` on the host's widget. */
  read(): unknown;
  updateOptions(options: Options): void;
  mergeOptions(options: Options): void;
  clearOverrides(): void;
  /** Creates a standalone widget (no host) with `[options]` set when given. */
  mount(options?: Options): Instance;
  cacheSizes(): CacheSizes;
  teardown(): void;
}

export interface RunResult {
  extras?: Record<string, number>;
  refs?: WeakRef<object>[];
}

export type Run = (tick: (i: number) => void) => RunResult | void;

export interface Workload {
  id: string;
  label: string;
  /** Operations in one run; per-operation figures divide by this. */
  ops: number;
  unit: 'read' | 'change' | 'instance';
  /** Setup (not measured); returns the measured closure. */
  prepare(rig: Rig, widget: Widget, size: Size): Run;
}

const CHANGES = 1000;

function w2(id: string, label: string, tweaked: boolean): Workload {
  return {
    id,
    label,
    ops: CHANGES,
    unit: 'change',
    prepare(rig, widget, size) {
      rig.bind(() => buildOptions(widget, size, 0));
      rig.detect();
      const objects = Array.from({ length: CHANGES }, (_, i) =>
        buildOptions(widget, size, tweaked ? i + 1 : 0),
      );
      return (tick) => {
        for (let i = 0; i < CHANGES; i++) {
          rig.bind(() => objects[i]);
          rig.detect();
          tick(i);
        }
      };
    },
  };
}

function w3(
  id: string,
  label: string,
  apply: 'update' | 'merge',
  kind: 'same' | 'leaf' | 'array',
): Workload {
  return {
    id,
    label,
    ops: CHANGES,
    unit: 'change',
    prepare(rig, widget, size) {
      rig.bind(() => buildOptions(widget, size, 0));
      rig.detect();
      const payloads = Array.from({ length: CHANGES }, (_, i) =>
        buildOverrides(widget, kind, i),
      );
      return (tick) => {
        for (let i = 0; i < CHANGES; i++) {
          if (apply === 'update') rig.updateOptions(payloads[i]);
          else rig.mergeOptions(payloads[i]);
          rig.read();
          tick(i);
        }
        rig.clearOverrides();
        rig.read();
      };
    },
  };
}

function w4(id: string, label: string, fresh: boolean): Workload {
  return {
    id,
    label,
    ops: CHANGES,
    unit: 'change',
    prepare(rig, widget, size) {
      let buildCalls = 0;
      const memoized = buildOptions(widget, size, 0);
      rig.bind(() => memoized);
      rig.detect();
      rig.bind(() => {
        buildCalls++;
        return fresh ? buildOptions(widget, size, 0) : memoized;
      });
      return (tick) => {
        for (let i = 0; i < CHANGES; i++) {
          rig.detect();
          tick(i);
        }
        return { extras: { buildCalls } };
      };
    },
  };
}

function w5(instances: number, withOptions: boolean): Workload {
  return {
    id: `W5-${instances}-${withOptions ? 'options' : 'none'}`,
    label: `mount/destroy ${instances} instances ${withOptions ? 'with' : 'without'} options`,
    ops: instances,
    unit: 'instance',
    prepare(rig, widget, size) {
      return (tick) => {
        const refs: WeakRef<object>[] = [];
        for (let i = 0; i < instances; i++) {
          const instance = rig.mount(
            withOptions ? buildOptions(widget, size, i) : undefined,
          );
          refs.push(new WeakRef(instance.component));
          instance.destroy();
          tick(i);
        }
        return { refs };
      };
    },
  };
}

export const WORKLOADS: readonly Workload[] = [
  {
    id: 'W1',
    label: '10,000 reads of component.config, nothing changed',
    ops: 10_000,
    unit: 'read',
    prepare(rig, widget, size) {
      rig.bind(() => buildOptions(widget, size, 0));
      rig.detect();
      rig.read();
      return (tick) => {
        for (let i = 0; i < 10_000; i++) {
          rig.read();
          tick(i);
        }
      };
    },
  },
  w2('W2-same', '1,000 input changes, new identity, identical content', false),
  w2('W2-leaf', '1,000 input changes, new identity, one leaf changed', true),
  w3(
    'W3-update-same',
    '1,000 updateOptions, unchanged content',
    'update',
    'same',
  ),
  w3(
    'W3-update-leaf',
    '1,000 updateOptions, one leaf changed',
    'update',
    'leaf',
  ),
  w3('W3-merge-same', '1,000 mergeOptions, unchanged content', 'merge', 'same'),
  w3('W3-merge-leaf', '1,000 mergeOptions, one leaf changed', 'merge', 'leaf'),
  w3('W3-merge-array', '1,000 mergeOptions, array replaced', 'merge', 'array'),
  w4(
    'W4-fresh',
    '1,000 detectChanges, fresh equal object per binding evaluation',
    true,
  ),
  w4('W4-memoized', '1,000 detectChanges, memoized binding', false),
  w5(50, true),
  w5(50, false),
  w5(500, true),
  w5(500, false),
];

export function summarize(samples: readonly number[]): {
  median: number;
  min: number;
  max: number;
} {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { median, min: sorted[0], max: sorted.at(-1)! };
}

export function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
