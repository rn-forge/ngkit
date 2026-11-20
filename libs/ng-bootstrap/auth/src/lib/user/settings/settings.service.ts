// external imports
import { inject, Injectable } from '@angular/core';
import { merge } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';

// internal imports
import {
  GenericType,
  LocalStorageService,
  ObjectUtil,
  isDebugMode,
} from '@rn-forge/ng/core';
import {
  DEFAULT_USER_SETTINGS,
  USER_SETTINGS_STORAGE_KEY,
  UserSettings,
} from './settings.types';

/**
 * Service for managing user settings, including retrieval, update, and persistence to local storage.
 *
 * @remarks
 * This service uses a reactive signal to track user settings and synchronizes changes with local storage.
 *
 * @example
 * ```typescript
 * // In an injection context (a field initializer or constructor body)
 * private readonly settings = inject(UserSettingsService);
 * private readonly stopListening = this.settings.registerChangeListener(
 *   'theme',
 *   (value) => (this.theme = value),
 * );
 *
 * this.settings.updateSetting('theme', 'dark');
 * this.settings.hasStoredSetting('theme'); // true
 * this.settings.clearStoredSettings();
 *
 * ngOnDestroy() {
 *   this.stopListening();
 * }
 * ```
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly localStorageService: LocalStorageService =
    inject(LocalStorageService);

  private _storedUserSettings!: Partial<UserSettings>;
  private _currentUserSettings!: UserSettings;
  private readonly _changeListeners: GenericType<BehaviorSubject<string>> = {};

  constructor() {
    this.readStoredSettings();
    this.buildCurrentUserSettings();
  }

  get storedUserSettings(): Partial<UserSettings> {
    return this._storedUserSettings;
  }

  get currentUserSettings(): UserSettings {
    return this._currentUserSettings;
  }

  /**
   * Registers a change listener for a specific user setting. The callback is
   * called immediately with the current value, then on every update.
   *
   * @returns a disposer that removes the listener; the caller must call it
   * when its owner goes away. Calling it more than once is harmless.
   */
  registerChangeListener(
    key: string,
    callback: (value: string) => void,
  ): () => void {
    if (isDebugMode())
      console.debug('UserSettingsService.registerChangeListener:', key);
    const subscription = ObjectUtil.setDefault(
      this._changeListeners,
      key,
      // could be undefined
      new BehaviorSubject<string>(this.currentUserSettings[key]),
    ).subscribe(callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Tells whether the user explicitly saved a value for `key`, as opposed to
   * the key only holding its declared default. False after
   * {@link clearStoredSettings}.
   */
  hasStoredSetting(key: string): boolean {
    return Object.hasOwn(this._storedUserSettings, key);
  }

  /**
   * Updates a user setting.
   */
  updateSetting(key: string, value: string): void {
    if (isDebugMode())
      console.debug('UserSettingsService.updateSetting:', key, value);

    // update the local signal
    this.storedUserSettings[key] = value;
    this.currentUserSettings[key] = value;

    // update the local storage
    this.localStorageService.setJSON(
      USER_SETTINGS_STORAGE_KEY,
      this.storedUserSettings,
    );

    // notify listeners
    this._changeListeners[key]?.next(value);
  }

  /**
   * Clears all stored user settings: the effective settings are rebuilt from a
   * fresh copy of the declared defaults, the empty override set is persisted,
   * and live listeners are notified of their reset values (`undefined` for a
   * key without a declared default).
   */
  clearStoredSettings(): void {
    if (isDebugMode()) console.debug('UserSettingsService.clearStoredSettings');
    this._storedUserSettings = {};
    this.buildCurrentUserSettings();
    this.localStorageService.setJSON(
      USER_SETTINGS_STORAGE_KEY,
      this._storedUserSettings,
    );
    Object.entries(this._changeListeners).forEach(([key, subject]) =>
      subject.next(this._currentUserSettings[key]),
    );
  }

  /**
   * Reads the stored user settings from local storage.
   */
  private readStoredSettings(): void {
    this._storedUserSettings = this.localStorageService.getJSON(
      USER_SETTINGS_STORAGE_KEY,
      {},
    );
    if (isDebugMode())
      console.debug(
        'UserSettingsService.storedUserSettings:',
        this._storedUserSettings,
      );
  }

  /**
   * Builds the current user settings by merging stored settings with default values.
   */
  private buildCurrentUserSettings(): void {
    this._currentUserSettings = merge(
      {},
      DEFAULT_USER_SETTINGS,
      this._storedUserSettings,
    );
    if (isDebugMode())
      console.debug(
        'UserSettingsService.currentUserSettings:',
        this.currentUserSettings,
      );
  }
}
