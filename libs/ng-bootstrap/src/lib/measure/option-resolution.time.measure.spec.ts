/**
 * Option-resolution time, memory and retention (S19.3.2). Runs only with
 * NGKIT_MEASURE=1 and `NODE_OPTIONS=--expose-gc`; see the brief's Result for the
 * run command. No spies and no module mocks are installed here, so the figures
 * are not perturbed by counting wrappers.
 */
import {
  Component,
  Signal,
  WritableSignal,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormComponent } from '@rn-forge/ng-bootstrap/form';
import {
  ConfigurableComponent,
  ConfigurerService,
} from '../bootstrap.component';
import { RN_FORGE_BOOTSTRAP_CONFIG_TOKEN } from '../bootstrap.config';
import { TableComponent } from '../table/table.component';
import {
  Options,
  Rig,
  SIZES,
  WIDGETS,
  WORKLOADS,
  Widget,
  Workload,
  buildOptions,
  round,
  summarize,
} from './measure.fixtures';

declare const process: {
  env: Record<string, string | undefined>;
  memoryUsage(): { heapUsed: number; rss: number };
};

const RUNS = 7;
const log = (record: Record<string, unknown>) =>
  console.log('MEASURE ' + JSON.stringify(record));
const gc = (globalThis as { gc?: () => void }).gc;
const heap = () => process.memoryUsage().heapUsed;
const kb = (bytes: number) => Math.round(bytes / 1024);
const macrotask = () => new Promise<void>((r) => setTimeout(r, 0));

async function collect(): Promise<void> {
  gc?.();
  await macrotask();
  gc?.();
  await macrotask();
}

@Component({
  selector: 'rnf-measure-table-host',
  standalone: true,
  imports: [TableComponent],
  template: '<rnf-table [options]="build(tick())" />',
})
class TableHost {
  readonly tick = signal(0);
  build: (tick: number) => Options = () => ({});
  readonly widget = viewChild.required(TableComponent);
}

@Component({
  selector: 'rnf-measure-form-host',
  standalone: true,
  imports: [FormComponent],
  template: '<rnf-form [options]="build(tick())" />',
})
class FormHost {
  readonly tick = signal(0);
  build: (tick: number) => Options = () => ({});
  readonly widget = viewChild.required(FormComponent);
}

interface Host {
  tick: WritableSignal<number>;
  build: (tick: number) => Options;
  widget: Signal<ConfigurableComponent>;
}

interface ServiceCaches {
  inputsCache: Record<string, unknown>;
  overridesCache: Record<string, unknown>;
  finalOptionsCache: Record<string, unknown>;
}

/** Keeps the jQuery plugin out of the measurement (the table skips `render()`). */
const RIG_CONFIG = {
  provide: RN_FORGE_BOOTSTRAP_CONFIG_TOKEN,
  useValue: { table: { autoRender: false } },
};

function createRig(kind: Widget): Rig {
  TestBed.configureTestingModule({
    imports: [TableHost, FormHost],
    providers: [RIG_CONFIG],
  });
  let fixture: ComponentFixture<Host> | undefined;
  const host = (): ComponentFixture<Host> =>
    (fixture ??= (
      kind === 'table'
        ? TestBed.createComponent(TableHost)
        : TestBed.createComponent(FormHost)
    ) as ComponentFixture<Host>);
  const widget = () => host().componentInstance.widget();
  return {
    bind: (build) => {
      host().componentInstance.build = build;
    },
    // The hosts are OnPush (the Angular 22 default), so a pass re-evaluates the
    // `[options]="build(tick())"` binding only when the host view is dirty. A
    // tick bump models a parent that re-renders on each pass.
    detect: () => {
      host().componentInstance.tick.update((n) => n + 1);
      host().detectChanges();
    },
    read: () => widget().config,
    updateOptions: (o) => widget().updateOptions(o as never),
    mergeOptions: (o) => widget().mergeOptions(o as never),
    clearOverrides: () => widget().clearOverrides(),
    mount: (options) => {
      if (kind === 'table') {
        const f = TestBed.createComponent(TableComponent);
        if (options) f.componentRef.setInput('options', options);
        f.detectChanges();
        return { component: f.componentInstance, destroy: () => f.destroy() };
      }
      const f = TestBed.createComponent(FormComponent);
      if (options) f.componentRef.setInput('options', options);
      f.detectChanges();
      return { component: f.componentInstance, destroy: () => f.destroy() };
    },
    cacheSizes: () => {
      const caches = TestBed.inject(
        ConfigurerService,
      ) as unknown as ServiceCaches;
      return {
        inputs: Object.keys(caches.inputsCache).length,
        overrides: Object.keys(caches.overridesCache).length,
        finals: Object.keys(caches.finalOptionsCache).length,
      };
    },
    teardown: () => TestBed.resetTestingModule(),
  };
}

/** Control for W4: the cost of building the fresh option objects alone. */
const BUILD_ONLY: Workload = {
  id: 'W4-build-only',
  label: '1,000 option-object builds, no Angular (control for W4-fresh)',
  ops: 1000,
  unit: 'change',
  prepare: (_rig, widget, size) => (tick) => {
    for (let i = 0; i < 1000; i++) {
      buildOptions(widget, size, 0);
      tick(i);
    }
  },
};

describe.skipIf(!process.env['NGKIT_MEASURE'])(
  'option-resolution time and memory',
  () => {
    it('exposes gc', () => {
      log({ kind: 'env', gcExposed: typeof gc === 'function', runs: RUNS });
      expect(RUNS).toBe(7);
    });

    for (const widget of WIDGETS) {
      for (const size of SIZES) {
        it(`${widget} ${size}`, async () => {
          for (const workload of [...WORKLOADS, BUILD_ONLY]) {
            const times: number[] = [];
            const befores: number[] = [];
            const peaks: number[] = [];
            const afters: number[] = [];
            const aliveBeforeReset: number[] = [];
            const aliveAfterReset: number[] = [];
            const caches: {
              inputs: number;
              overrides: number;
              finals: number;
            }[] = [];
            let extras: Record<string, number> = {};

            // run 0 is the discarded warm-up
            for (let run = 0; run <= RUNS; run++) {
              const rig = createRig(widget);
              const measured = workload.prepare(rig, widget, size);
              await collect();
              const before = heap();
              let peak = before;
              const tick = (i: number) => {
                if (i % 100 === 0) peak = Math.max(peak, heap());
              };
              const start = performance.now();
              const result = measured(tick);
              const elapsed = performance.now() - start;
              peak = Math.max(peak, heap());
              gc?.();
              const after = heap();

              if (run > 0) {
                times.push(elapsed);
                befores.push(before);
                peaks.push(peak);
                afters.push(after);
                extras = result?.extras ?? extras;
              }
              if (result?.refs) {
                await collect();
                const alive = result.refs.filter((r) => r.deref()).length;
                if (run > 0) {
                  aliveBeforeReset.push(alive);
                  caches.push(rig.cacheSizes());
                }
                rig.teardown();
                await collect();
                if (run > 0) {
                  aliveAfterReset.push(
                    result.refs.filter((r) => r.deref()).length,
                  );
                }
              } else {
                rig.teardown();
              }
            }

            const t = summarize(times);
            const perOp = (ms: number) => round((ms / workload.ops) * 1000, 3);
            const retained = afters.map((a, i) => a - befores[i]);
            expect(times).toHaveLength(RUNS);
            log({
              kind: 'time',
              widget,
              size,
              workload: workload.id,
              label: workload.label,
              ops: workload.ops,
              unit: workload.unit,
              runsMs: times.map((x) => round(x)),
              medianMs: round(t.median),
              minMs: round(t.min),
              maxMs: round(t.max),
              spreadPct: round(((t.max - t.min) / t.median) * 100, 1),
              medianUsPerOp: perOp(t.median),
              minUsPerOp: perOp(t.min),
              maxUsPerOp: perOp(t.max),
              heapBeforeKb: kb(summarize(befores).median),
              heapPeakKb: kb(summarize(peaks).max),
              heapAfterKb: kb(summarize(afters).median),
              retainedDeltaKb: {
                median: kb(summarize(retained).median),
                min: kb(summarize(retained).min),
                max: kb(summarize(retained).max),
              },
              rssMb: Math.round(process.memoryUsage().rss / 1048576),
              extras,
              ...(aliveBeforeReset.length
                ? {
                    destroyedInstancesAliveBeforeReset: aliveBeforeReset,
                    destroyedInstancesAliveAfterReset: aliveAfterReset,
                    cacheEntriesAfterDestroy: caches,
                  }
                : {}),
            });
          }
        }, 3_600_000);
      }
    }
  },
);
