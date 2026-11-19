/**
 * Option-resolution operation counts (S19.3.2). Runs only with NGKIT_MEASURE=1;
 * see the brief's Result for the run command. Counts are deterministic; no
 * timing is taken from this file because spies and wrappers are installed.
 */
import { Injectable } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RNF_PERMISSION } from '@rn-forge/ng/auth';
import { ObjectUtil, RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { CrudDataSource, ReadModel, WriteModel } from '@rn-forge/ng/crud';
import {
  AbstractCrudManager,
  CrudComponent,
} from '@rn-forge/ng-bootstrap/crud';
import {
  ChangeDetectorRef,
  Component,
  Signal,
  WritableSignal,
  signal,
  inject,
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
import { Options, Rig, Widget } from './measure.fixtures';
import {
  SIZES,
  WIDGETS,
  WORKLOADS,
  buildOptions,
  leafCount,
} from './measure.fixtures';

declare const process: { env: Record<string, string | undefined> };

// lodash `merge`/`mergeWith` are not wrapped: a module-level `vi.mock` of
// `lodash-es` breaks any run that loads this file together with another spec
// ("Cannot access '__vi_import_1__' before initialization"). `merge` calls are
// derived instead: `componentOptions` makes exactly two per recompute and
// `componentDefaults` one per cache miss; `mergeOptions` makes one `mergeWith`.

const log = (record: Record<string, unknown>) =>
  console.log('MEASURE ' + JSON.stringify(record));

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

interface Tally {
  diffTop: number;
  diffTotal: number;
  componentOptions: number;
  componentDefaultsMiss: number;
  configureOptions: number;
  recomputes: number;
  mergeOptionsCalls: number;
  merge: number;
  mergeWith: number;
  byKey: Record<string, number>;
}

const tally: Tally = {
  diffTop: 0,
  diffTotal: 0,
  componentOptions: 0,
  componentDefaultsMiss: 0,
  configureOptions: 0,
  recomputes: 0,
  mergeOptionsCalls: 0,
  merge: 0,
  mergeWith: 0,
  byKey: {},
};

function resetTally(): void {
  tally.diffTop = 0;
  tally.diffTotal = 0;
  tally.componentOptions = 0;
  tally.componentDefaultsMiss = 0;
  tally.configureOptions = 0;
  tally.byKey = {};
  tally.recomputes = 0;
  tally.mergeOptionsCalls = 0;
}

function snapshot(): Omit<Tally, 'byKey'> & { byKey: Record<string, number> } {
  return {
    ...tally,
    merge: 2 * tally.recomputes + tally.componentDefaultsMiss,
    mergeWith: tally.mergeOptionsCalls,
    byKey: { ...tally.byKey },
  };
}

function installSpies(): void {
  const originalDiff = ObjectUtil.diff.bind(ObjectUtil);
  let depth = 0;
  vi.spyOn(ObjectUtil, 'diff').mockImplementation((a, b) => {
    depth++;
    tally.diffTotal++;
    if (depth === 1) tally.diffTop++;
    try {
      return originalDiff(a, b);
    } finally {
      depth--;
    }
  });

  const proto = ConfigurerService.prototype;
  const originalOptions = proto.componentOptions;
  vi.spyOn(proto, 'componentOptions').mockImplementation(function (
    this: ConfigurerService,
    component,
    overrides,
  ) {
    tally.componentOptions++;
    tally.byKey[component.configKey] =
      (tally.byKey[component.configKey] ?? 0) + 1;
    const finals = (this as unknown as { finalOptionsCache: object })
      .finalOptionsCache as Record<string, unknown>;
    const before = finals[component.instanceId];
    const result = originalOptions.call(this, component, overrides);
    if (finals[component.instanceId] !== before) tally.recomputes++;
    return result;
  });
  const originalMergeOptions = ConfigurableComponent.prototype.mergeOptions;
  vi.spyOn(ConfigurableComponent.prototype, 'mergeOptions').mockImplementation(
    function (this: ConfigurableComponent, updates) {
      tally.mergeOptionsCalls++;
      return originalMergeOptions.call(this, updates);
    },
  );
  const originalDefaults = proto.componentDefaults;
  vi.spyOn(proto, 'componentDefaults').mockImplementation(function (
    this: ConfigurerService,
    component,
  ) {
    const cache = (
      this as unknown as { defaultsCache: Record<string, unknown> }
    ).defaultsCache;
    if (!cache[component.configKey]) tally.componentDefaultsMiss++;
    return originalDefaults.call(this, component);
  });
  for (const widget of [TableComponent, FormComponent]) {
    const original = widget.prototype.configureOptions;
    vi.spyOn(widget.prototype, 'configureOptions').mockImplementation(function (
      this: unknown,
      options: never,
    ) {
      tally.configureOptions++;
      return (original as (o: unknown) => void).call(this, options);
    } as never);
  }
}

// ---- CRUD side -----------------------------------------------------------

interface TestWrite extends WriteModel {
  name?: string;
}
interface TestRead extends ReadModel {
  readonly name: string;
}

@Injectable()
class MeasureCrudManager extends AbstractCrudManager<TestWrite, TestRead> {
  override name = 'Widget';
  override permissionKey = 'demo.widgets';
  private readonly source: CrudDataSource<TestWrite, TestRead> = {
    list: () => of({ items: [{ id: 1, name: 'A' }], nextPageToken: null }),
    get: (id: number) => of({ value: { id, name: 'n' }, etag: '"e"' }),
    create: () => of({ value: { id: 9, name: 'new' } }),
    update: () => of({ value: { id: 1, name: 'up' } }),
    delete: () => of(undefined),
  };
  override get dataSource() {
    return this.source;
  }
  override tableColumns() {
    return [{ field: 'name', title: 'Name' }];
  }
  override addUpdateFormControls() {
    return { name: [''] };
  }
  override toAddUpdateFormValue(data: TestRead): TestWrite {
    return { id: data.id, name: data.name };
  }
  override fromAddUpdateFormValue(): TestWrite {
    return { name: 'typed' };
  }
}

@Component({
  selector: 'rnf-measure-crud-host',
  standalone: true,
  imports: [CrudComponent],
  providers: [MeasureCrudManager],
  template: `
    <ng-template #formTpl let-ctx>form</ng-template>
    <rnf-crud
      [manager]="manager"
      [addUpdateFormTemplate]="formTpl"
      [options]="{ list: { autoRender: false } }" />
  `,
})
class CrudHost {
  readonly manager = inject(MeasureCrudManager);
}

describe.skipIf(!process.env['NGKIT_MEASURE'])(
  'option-resolution operation counts',
  () => {
    beforeAll(() => installSpies());
    afterAll(() => vi.restoreAllMocks());
    afterEach(() => TestBed.resetTestingModule());

    for (const widget of WIDGETS) {
      for (const size of SIZES) {
        it(`${widget} ${size}: fixture and resolved leaf counts`, () => {
          const rig = createRig(widget);
          rig.bind(() => buildOptions(widget, size, 0));
          rig.detect();
          const resolved = leafCount(rig.read());
          const fixtureLeaves = leafCount(buildOptions(widget, size, 0));
          expect(fixtureLeaves).toBeGreaterThan(0);
          log({
            kind: 'fixture',
            widget,
            size,
            fixtureLeaves,
            resolvedLeaves: resolved,
          });
        });

        for (const workload of WORKLOADS) {
          it(`${widget} ${size} ${workload.id}`, () => {
            const rig = createRig(widget);
            const run = workload.prepare(rig, widget, size);
            resetTally();
            const result = run(() => undefined);
            const totals = snapshot();
            const perOp = (n: number) =>
              Math.round((n / workload.ops) * 1000) / 1000;
            expect(totals.componentOptions).toBeGreaterThanOrEqual(0);
            log({
              kind: 'counts',
              widget,
              size,
              workload: workload.id,
              label: workload.label,
              ops: workload.ops,
              unit: workload.unit,
              totals,
              perOp: {
                diffTop: perOp(totals.diffTop),
                diffTotal: perOp(totals.diffTotal),
                componentOptions: perOp(totals.componentOptions),
                componentDefaultsMiss: perOp(totals.componentDefaultsMiss),
                configureOptions: perOp(totals.configureOptions),
                merge: perOp(totals.merge),
                mergeWith: perOp(totals.mergeWith),
              },
              extras: result?.extras ?? {},
            });
          });
        }
      }
    }

    for (const markDirty of [false, true]) {
      it(`CRUD: option builders over 1,000 passes (${markDirty ? 'CrudComponent view marked dirty each pass' : 'no dirtying, default OnPush'})`, () => {
        TestBed.configureTestingModule({
          imports: [CrudHost],
          providers: [
            RIG_CONFIG,
            provideRouter([]),
            {
              provide: RN_FORGE_APP_CONFIG_TOKEN,
              useValue: { appName: 'measure' },
            },
            {
              provide: RNF_PERMISSION,
              useValue: { hasPermission: () => true },
            },
          ],
        });
        const fixture = TestBed.createComponent(CrudHost);
        const manager = fixture.componentInstance.manager;
        let addUpdateCalls = 0;
        let deleteCalls = 0;
        const originalAddUpdate = manager.addUpdateFormOptions.bind(manager);
        const originalDelete = manager.deleteModalOptions.bind(manager);
        vi.spyOn(manager, 'addUpdateFormOptions').mockImplementation(() => {
          addUpdateCalls++;
          return originalAddUpdate();
        });
        vi.spyOn(manager, 'deleteModalOptions').mockImplementation(() => {
          deleteCalls++;
          return originalDelete();
        });
        fixture.detectChanges();
        const initial = { addUpdateCalls, deleteCalls };
        const dirty =
          fixture.debugElement.children[0].injector.get(ChangeDetectorRef);
        addUpdateCalls = 0;
        deleteCalls = 0;
        resetTally();
        const passes = 1000;
        for (let i = 0; i < passes; i++) {
          if (markDirty) dirty.markForCheck();
          fixture.detectChanges();
        }
        const totals = snapshot();
        expect(addUpdateCalls).toBeGreaterThanOrEqual(0);
        log({
          kind: 'crud',
          markDirty,
          passes,
          initialPassCalls: initial,
          addUpdateFormOptionsCalls: addUpdateCalls,
          deleteModalOptionsCalls: deleteCalls,
          mergeCallsInsideTheTwoBuilders: addUpdateCalls + deleteCalls,
          totals,
        });
      });
    }
  },
);
