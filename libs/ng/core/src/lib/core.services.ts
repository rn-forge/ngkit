// external imports
import { DOCUMENT, Location } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  NavigationExtras,
  Params,
  Router,
} from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';

// internal imports
import { RN_FORGE_APP_CONFIG_TOKEN, RnForgeCoreConfig } from './core.config';
import { isDebugMode } from './core.utils';

// definitions
/** The Web Storage backing LocalStorageService; null when unavailable (SSR, blocked). */
export const RNF_BROWSER_STORAGE = new InjectionToken<Storage | null>(
  'RnForgeBrowserStorage',
  {
    providedIn: 'root',
    factory: () => {
      try {
        // DOCUMENT from @angular/core. The getter can throw SecurityError.
        return inject(DOCUMENT).defaultView?.localStorage ?? null;
      } catch {
        return null;
      }
    },
  },
);

export type StorageFailureReason =
  | 'unavailable' // token is null
  | 'security' // DOMException name 'SecurityError'
  | 'quota' // DOMException name 'QuotaExceededError' or 'NS_ERROR_DOM_QUOTA_REACHED'
  | 'malformed' // stored text is not valid JSON
  | 'invalid' // parsed JSON rejected by the caller's validator
  | 'unserializable' // JSON.stringify threw (cycle, BigInt) or returned undefined
  | 'unknown'; // anything else

export type StorageReadResult<T> =
  | { readonly status: 'found'; readonly value: T }
  | { readonly status: 'missing'; readonly value: T } // value is the fallback
  | {
      readonly status: 'failed';
      readonly value: T; // value is the fallback
      readonly reason: StorageFailureReason;
      readonly error?: unknown;
    };

export type StorageWriteResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: StorageFailureReason;
      readonly error?: unknown;
    };

/** Classifies a caught error into a {@link StorageFailureReason}. Checks `error.name`, never `instanceof DOMException` (jsdom and browsers differ). */
function classifyStorageError(error: unknown): StorageFailureReason {
  const name = (error as { name?: unknown } | undefined)?.name;
  if (name === 'SecurityError') return 'security';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'quota';
  }
  return 'unknown';
}

const UNAVAILABLE_ERROR = () =>
  new Error('[rn-forge.ng.core] Browser storage is unavailable …');

/**
 * Namespaced wrapper around the Web Storage API that automatically prefixes every key
 * with the application name (from {@link RnForgeCoreConfig}).
 * This prevents key collisions when multiple apps share the same origin.
 *
 * The strict methods below (`get`/`getJSON`/`set`/`setJSON`/`remove`/`clearAll`) throw on
 * failure; the `try*` methods never throw and instead return a {@link StorageReadResult} or
 * {@link StorageWriteResult} describing the outcome.
 *
 * **Why a hand-rolled wrapper.** `ngx-webstorage` 22.0.0 is maintained, but `retrieve()`
 * returns `any` with no validation, it reports no failure result, and it JSON-encodes every
 * value — that would break raw-string keys such as a pre-bootstrap theme read.
 * `@ngx-pwa/local-storage` is async IndexedDB, a different model. Nothing maintained covers
 * explicit failure results over the Web Storage API, so the wrapper stays here.
 *
 * @example
 * ```ts
 * // In app.config.ts
 * provideRnForgeCoreConfig({ appName: 'my-app' })
 *
 * // In a component or service
 * constructor(private storage: LocalStorageService) {}
 *
 * this.storage.setJSON('prefs', { theme: 'dark' });
 * const prefs = this.storage.getJSON<Prefs>('prefs');
 *
 * const result = this.storage.tryGetJSON('prefs', { validate: isPrefs, fallback: null });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly appName: string;
  private readonly config: RnForgeCoreConfig = inject(
    RN_FORGE_APP_CONFIG_TOKEN,
  );
  private readonly storage: Storage | null = inject(RNF_BROWSER_STORAGE);

  constructor() {
    this.appName = this.config.appName;
  }

  private namespacedKey(key: string): string {
    return `${this.appName}.${key}`;
  }

  private requireStorage(): Storage {
    if (!this.storage) throw UNAVAILABLE_ERROR();
    return this.storage;
  }

  /** Returns the string value for `key`, or `defaultValue` (default: `''`) if absent. Throws if storage is unavailable. */
  get(key: string, defaultValue = ''): string {
    return (
      this.requireStorage().getItem(this.namespacedKey(key)) ?? defaultValue
    );
  }

  /** Returns the JSON-parsed value for `key`, or `defaultValue` (default: `{}`) if absent. Throws if storage is unavailable. */
  getJSON<T>(key: string, defaultValue?: T): T {
    const data = this.get(key);
    return data ? JSON.parse(data) : ((defaultValue ?? {}) as T);
  }

  /** Stores a string `value` under `key`. Throws if storage is unavailable. */
  set(key: string, value: string): void {
    this.requireStorage().setItem(this.namespacedKey(key), value);
  }

  /** Serialises `value` to JSON and stores it under `key`. Throws if storage is unavailable. */
  setJSON(key: string, value: object): void {
    this.requireStorage().setItem(
      this.namespacedKey(key),
      JSON.stringify(value),
    );
  }

  /** Removes the entry for `key`. Throws if storage is unavailable. */
  remove(key: string): void {
    this.requireStorage().removeItem(this.namespacedKey(key));
  }

  /** Removes all entries that belong to this application. Throws if storage is unavailable. */
  clearAll(): void {
    const storage = this.requireStorage();
    const prefix = `${this.appName}.`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  }

  /** Returns the string value for `key`, or `fallback` if absent. Never throws. */
  tryGet(key: string, fallback: string): StorageReadResult<string> {
    if (!this.storage) {
      return { status: 'failed', value: fallback, reason: 'unavailable' };
    }
    try {
      const raw = this.storage.getItem(this.namespacedKey(key));
      if (raw === null) return { status: 'missing', value: fallback };
      return { status: 'found', value: raw };
    } catch (error) {
      return {
        status: 'failed',
        value: fallback,
        reason: classifyStorageError(error),
        error,
      };
    }
  }

  /** Returns the JSON-parsed, validated value for `key`, or the fallback if absent/invalid. Never throws. */
  tryGetJSON<T>(
    key: string,
    options: { validate: (value: unknown) => value is T; fallback: T },
  ): StorageReadResult<T> {
    const { validate, fallback } = options;
    if (!this.storage) {
      return { status: 'failed', value: fallback, reason: 'unavailable' };
    }
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.namespacedKey(key));
    } catch (error) {
      return {
        status: 'failed',
        value: fallback,
        reason: classifyStorageError(error),
        error,
      };
    }
    if (raw === null) return { status: 'missing', value: fallback };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { status: 'failed', value: fallback, reason: 'malformed', error };
    }

    if (!validate(parsed)) {
      return { status: 'failed', value: fallback, reason: 'invalid' };
    }
    return { status: 'found', value: parsed };
  }

  /** Stores a string `value` under `key`. Never throws. */
  trySet(key: string, value: string): StorageWriteResult {
    if (!this.storage) return { ok: false, reason: 'unavailable' };
    try {
      this.storage.setItem(this.namespacedKey(key), value);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: classifyStorageError(error), error };
    }
  }

  /** Serialises `value` to JSON and stores it under `key`. Never throws. */
  trySetJSON(key: string, value: unknown): StorageWriteResult {
    if (!this.storage) return { ok: false, reason: 'unavailable' };
    let serialised: string;
    try {
      serialised = JSON.stringify(value);
      if (serialised === undefined)
        throw new Error('JSON.stringify returned undefined');
    } catch (error) {
      return { ok: false, reason: 'unserializable', error };
    }
    try {
      this.storage.setItem(this.namespacedKey(key), serialised);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: classifyStorageError(error), error };
    }
  }

  /** Removes the entry for `key`. Never throws. */
  tryRemove(key: string): StorageWriteResult {
    if (!this.storage) return { ok: false, reason: 'unavailable' };
    try {
      this.storage.removeItem(this.namespacedKey(key));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: classifyStorageError(error), error };
    }
  }
}

/**
 * Thin facade over Angular's `Router` and `Location` that exposes the most common
 * navigation helpers as a single injectable service.
 *
 * @example
 * ```ts
 * constructor(private route: RouteService) {}
 *
 * const id = this.route.queryParams['id'];
 * this.route.navigateByUrl('/dashboard');
 * this.route.goBack();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class RouteService {
  router: Router = inject(Router);
  location: Location = inject(Location);

  /** The deepest currently active `ActivatedRouteSnapshot`. */
  get snapshot(): ActivatedRouteSnapshot {
    let activatedRoute = this.router.routerState.snapshot.root;
    while (activatedRoute.firstChild) {
      activatedRoute = activatedRoute.firstChild;
    }
    return activatedRoute;
  }

  /** The full current URL including query string (from `Router.url`). */
  get currentUrl(): string {
    return this.router.url;
  }

  /** The current path without the origin (from `Location.path()`). */
  get currentPath(): string {
    return this.location.path();
  }

  /** Query parameters of the currently active route. */
  get queryParams(): Params {
    return this.snapshot.queryParams;
  }

  /**
   * Navigates to `url`. By default reloads even when navigating to the same URL
   * and replaces the current history entry; pass `extras` (e.g.
   * `{ replaceUrl: false }`) to override any {@link NavigationExtras} option.
   */
  navigateByUrl(url: string, extras: NavigationExtras = {}): void {
    if (isDebugMode()) console.debug('RouteService.navigateByUrl:', url);
    this.router.navigateByUrl(url, {
      onSameUrlNavigation: 'reload',
      replaceUrl: true,
      ...extras,
    });
  }

  /** Navigates back in browser history. */
  goBack(): void {
    if (isDebugMode()) console.debug('RouteService.goBack');
    this.location.back();
  }
}

/**
 * Abstract base class for a typed publish/subscribe service backed by a `BehaviorSubject`.
 * Extend this class and implement `initialValue()` to create a simple reactive state bus.
 *
 * @template T The type of value published and subscribed to.
 *
 * @example
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class ThemeService extends PubSubService<'light' | 'dark'> {
 *   initialValue() { return 'light' as const; }
 *
 *   setTheme(theme: 'light' | 'dark') { this.publish(theme); }
 * }
 * ```
 */
export abstract class PubSubService<T> {
  protected subject: BehaviorSubject<T>;

  constructor() {
    this.subject = new BehaviorSubject<T>(this.initialValue());
  }

  abstract initialValue(): T;

  get value(): T {
    return this.subject.value;
  }

  subscribe(callback: (value: T) => void): Subscription {
    return this.subject.subscribe((changedValue) => {
      callback(changedValue);
    });
  }

  protected publish(newValue: T): void {
    this.subject.next(newValue);
  }
}
