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
 * const userSettingsService = new UserSettingsService();
 * userSettingsService.updateSettings('theme', 'dark');
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
   * Registers a change listener for a specific user setting.
   */
  registerChangeListener(key: string, callback: (value: string) => void): void {
    if (isDebugMode())
      console.debug('UserSettingsService.registerChangeListener:', key);
    ObjectUtil.setDefault(
      this._changeListeners,
      key,
      // could be undefined
      new BehaviorSubject<string>(this.currentUserSettings[key]),
    ).subscribe(callback);
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
   * Clears all stored user settings.
   */
  clearStoredSettings(): void {
    if (isDebugMode()) console.debug('UserSettingsService.clearStoredSettings');
    this._storedUserSettings = {};
    this._currentUserSettings = DEFAULT_USER_SETTINGS;
    this.localStorageService.setJSON(
      USER_SETTINGS_STORAGE_KEY,
      this._storedUserSettings,
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
