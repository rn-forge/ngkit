// external imports
import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Params, Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';

// internal imports
import { RN_FORGE_APP_CONFIG_TOKEN, RnForgeCoreConfig } from './core.config';
import { isDebugMode } from './core.utils';

// definitions
/**
 * Namespaced wrapper around `localStorage` that automatically prefixes every key
 * with the application name (from {@link RnForgeCoreConfig}).
 * This prevents key collisions when multiple apps share the same origin.
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
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly appName: string;
  private readonly config: RnForgeCoreConfig = inject(
    RN_FORGE_APP_CONFIG_TOKEN,
  );

  constructor() {
    this.appName = this.config.appName;
  }

  /** Returns the string value for `key`, or `defaultValue` (default: `''`) if absent. */
  get(key: string, defaultValue = ''): string {
    return localStorage.getItem(`${this.appName}.${key}`) ?? defaultValue;
  }

  /** Returns the JSON-parsed value for `key`, or `defaultValue` (default: `{}`) if absent. */
  getJSON<T>(key: string, defaultValue?: T): T {
    const data = this.get(key);
    return data ? JSON.parse(data) : ((defaultValue ?? {}) as T);
  }

  /** Stores a string `value` under `key`. */
  set(key: string, value: string): void {
    localStorage.setItem(`${this.appName}.${key}`, value);
  }

  /** Serialises `value` to JSON and stores it under `key`. */
  setJSON(key: string, value: object): void {
    localStorage.setItem(`${this.appName}.${key}`, JSON.stringify(value));
  }

  /** Removes the entry for `key`. */
  remove(key: string): void {
    localStorage.removeItem(`${this.appName}.${key}`);
  }

  /** Removes all entries that belong to this application. */
  clearAll(): void {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${this.appName}.`))
      .forEach((key) => localStorage.removeItem(key));
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
   * Navigates to `url`. Always reloads even when navigating to the same URL,
   * and replaces the current history entry (`replaceUrl: true`).
   */
  navigateByUrl(url: string): void {
    if (isDebugMode()) console.debug('RouteService.navigateByUrl:', url);
    this.router.navigateByUrl(url, {
      onSameUrlNavigation: 'reload',
      replaceUrl: true,
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
