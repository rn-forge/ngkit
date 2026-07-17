// external imports
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injectable,
  input,
  InputSignal,
  Renderer2,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { get, isEmpty, merge, mergeWith } from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';

// internal imports
import {
  BaseComponent,
  GenericType,
  isDebugMode,
  ObjectUtil,
} from '@rn-forge/ng/core';
import { RN_FORGE_BOOTSTRAP_CONFIG_TOKEN } from './bootstrap.config';

/** Generic options bag used as the base type for component configuration objects. */
export type ConfigOptions<$T = unknown> = GenericType<$T>;

/**
 * Contract implemented by every configurable component. You rarely need to use this
 * interface directly — extend {@link ConfigurableComponent} instead.
 */
export interface Configurable<$O extends ConfigOptions> {
  readonly instanceId: string;
  readonly configKey: string;
  readonly options: InputSignal<Partial<$O>>;
  get config(): $O;
  defaultOptions(): Partial<$O>;
  configureOptions(currentOptions: Partial<$O>): void;
  updateOptions(updates?: Partial<$O>): void;
  mergeOptions(updates: Partial<$O>): void;
  clearOverrides(): void;
}

/**
 * Root singleton that resolves the final option set for each `ConfigurableComponent` instance.
 *
 * The resolution order (lower priority → higher priority):
 * 1. `defaultOptions()` — component's built-in defaults
 * 2. Global app config — values from `RN_FORGE_BOOTSTRAP_CONFIG_TOKEN` keyed by `configKey`
 * 3. `[options]` input — options passed in as an Angular input at usage time
 * 4. `updateOptions()` / `mergeOptions()` — imperative runtime overrides
 *
 * Results are cached per `(configKey, instanceId)` and only recomputed when inputs or
 * overrides change.
 */
@Injectable({
  providedIn: 'root',
})
export class ConfigurerService {
  private readonly appConfig = inject(RN_FORGE_BOOTSTRAP_CONFIG_TOKEN);

  private defaultsCache: GenericType<ConfigOptions> = {};
  private inputsCache: GenericType<ConfigOptions> = {};
  private overridesCache: GenericType<ConfigOptions> = {};
  private finalOptionsCache: GenericType<ConfigOptions> = {};

  resetDefaults(): void {
    if (isDebugMode()) console.debug('ConfigurerService.resetDefaults');
    this.defaultsCache = {};
  }

  destroyInstance(instanceId: string): void {
    delete this.inputsCache[instanceId];
    delete this.overridesCache[instanceId];
    delete this.finalOptionsCache[instanceId];
  }

  componentDefaults<$O extends ConfigOptions>(
    component: ConfigurableComponent<$O>,
  ): Partial<$O> {
    if (this.defaultsCache[component.configKey]) {
      return this.defaultsCache[component.configKey] as Partial<$O>;
    }

    const globalOptions = get(
      this.appConfig,
      component.configKey,
    ) as Partial<$O>;
    const defaultOptions = component.defaultOptions();
    const mergedDefaults = merge({}, defaultOptions, globalOptions ?? {});

    if (isDebugMode()) {
      console.debug(
        `ConfigurerService.${component.configKey}.defaults:`,
        mergedDefaults,
      );
    }

    this.defaultsCache[component.configKey] = mergedDefaults as ConfigOptions;
    return mergedDefaults;
  }

  componentOptions<$O extends ConfigOptions>(
    component: ConfigurableComponent<$O>,
    overrides: Partial<$O>,
  ): Partial<$O> {
    const inputOptions = component.options();

    let inputChanged = true;
    if (component.instanceId in this.inputsCache) {
      const inputDiff = ObjectUtil.diff(
        this.inputsCache[component.instanceId] as Partial<$O>,
        inputOptions,
      );
      inputChanged = !isEmpty(inputDiff);
    }
    if (inputChanged) {
      this.inputsCache[component.instanceId] = inputOptions as ConfigOptions;
    }

    let overridesChanged = true;
    if (component.instanceId in this.overridesCache) {
      const overrideDiff = ObjectUtil.diff(
        this.overridesCache[component.instanceId] as Partial<$O>,
        overrides,
      );
      overridesChanged = !isEmpty(overrideDiff);
    }
    if (overridesChanged) {
      this.overridesCache[component.instanceId] = overrides as ConfigOptions;
    }

    if (!inputChanged && !overridesChanged) {
      return this.finalOptionsCache[component.instanceId] as Partial<$O>;
    }

    const mergedOptions = merge(
      {},
      this.componentDefaults(component),
      inputOptions ?? {},
    );
    const finalOptions = merge(mergedOptions, overrides);

    component.configureOptions(finalOptions);

    if (isDebugMode()) {
      console.debug(
        `ConfigurerService.${component.configKey}[${component.instanceId}]:`,
        finalOptions,
      );
    }

    this.finalOptionsCache[component.instanceId] = finalOptions;
    return finalOptions;
  }
}

/**
 * Abstract base class for all `@rn-forge/ng-bootstrap` components.
 *
 * Extend this class and implement {@link configKey} (matching the key in
 * `RnForgeBootstrapConfig`) and optionally override:
 * - `defaultOptions()` — return built-in defaults for your options type
 * - `configureOptions()` — react to the resolved options (e.g. wire up side effects)
 *
 * The resolved `config` object is available as a signal-backed getter; components that
 * expose an imperative API (e.g. `alert`, `table`, `modal`) accept overrides at runtime
 * via `updateOptions()` or `mergeOptions()`.
 *
 * Both `[options]` (input binding) and `[htmlAttributes]` (arbitrary HTML attributes on
 * the host element) are provided by this base class.
 *
 * @template $O Options type extending {@link ConfigOptions}.
 */
@Component({
  template: '',
})
export abstract class ConfigurableComponent<
  $O extends ConfigOptions = ConfigOptions,
>
  extends BaseComponent
  implements Configurable<$O>
{
  private readonly configurerService = inject(ConfigurerService);
  private readonly host = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  readonly instanceId: string = uuidv4();
  abstract configKey: string;
  readonly options: InputSignal<Partial<$O>> = input<Partial<$O>>({});
  readonly htmlAttributes: InputSignal<Record<string, string>> = input<
    Record<string, string>
  >({});

  private readonly _componentOptions: Signal<Partial<$O>>;
  protected readonly _updatedOptions: WritableSignal<Partial<$O>> = signal<
    Partial<$O>
  >({});

  constructor() {
    super();

    this._componentOptions = computed(
      () =>
        this.configurerService.componentOptions(
          this,
          this._updatedOptions(),
        ) as Partial<$O>,
      { equal: (a, b) => isEmpty(ObjectUtil.diff(a, b)) },
    );

    effect(() => {
      if (isDebugMode())
        console.debug(
          `${this.configKey}[${this.instanceId}].htmlAttributes:`,
          this.htmlAttributes(),
        );
      Object.entries(this.htmlAttributes() ?? {}).forEach(([key, value]) => {
        this.renderer.setAttribute(this.host.nativeElement, key, value);
      });
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.configurerService.destroyInstance(this.instanceId);
  }

  /** The fully resolved, merged configuration for this component instance. */
  get config(): $O {
    return this._componentOptions() as $O;
  }

  /** Override to provide built-in defaults for this component's options type. */
  defaultOptions(): Partial<$O> {
    return {};
  }

  /**
   * Called by {@link ConfigurerService} after every option resolution cycle.
   * Override to react to the resolved options (e.g. update internal state or wire side effects).
   */
  configureOptions(_currentOptions: Partial<$O>): void {
    return;
  }

  /**
   * Replaces the current runtime overrides with `updates`.
   * Pass `undefined` to clear overrides without changing anything else.
   */
  updateOptions(updates?: Partial<$O>): void {
    if (updates) {
      if (isDebugMode())
        console.debug(
          `${this.configKey}[${this.instanceId}].updateOptions:`,
          updates,
        );
      this._updatedOptions.set(updates);
    }
  }

  /**
   * Deep-merges `updates` into the current runtime overrides.
   * Arrays in `updates` replace arrays in the current overrides rather than being concatenated.
   */
  mergeOptions(updates: Partial<$O>): void {
    if (isDebugMode())
      console.debug(
        `${this.configKey}[${this.instanceId}].mergeOptions:`,
        updates,
      );
    this._updatedOptions.update((current) =>
      mergeWith({}, current, updates, (_a, b) =>
        Array.isArray(b) ? b : undefined,
      ),
    );
  }

  /** Removes all runtime overrides, falling back to defaults and `[options]` input. */
  clearOverrides(): void {
    if (isDebugMode())
      console.debug(`${this.configKey}[${this.instanceId}].clearOverrides`);
    this._updatedOptions.set({});
  }
}
