// external imports

// internal imports
import { GenericType } from '@rn-forge/ng/core';
import { ConfigOptions } from '@rn-forge/ng-bootstrap';

export const USER_SETTINGS_CONFIG_KEY = 'user.settings';
export const USER_SETTINGS_STORAGE_KEY = 'user-settings';

/**
 * Represents the user settings for the application.
 *
 * @property theme - The selected theme for the user interface.
 * @property colorMode - The color mode preference (e.g., 'light', 'dark').
 * @property navbarColor - The color of the navigation bar.
 * @property [key: string] - Additional user settings as key-value pairs.
 */
export interface UserSettings {
  theme: string;
  colorMode: string;
  navbarColor: string;
  [key: string]: string;
}

/**
 * Represents a user setting configuration.
 *
 * @extends GenericType
 *
 * @property {boolean} [enabled] - Indicates if the setting is enabled.
 * @property {string} key - Unique identifier for the setting.
 * @property {string} [icon] - Optional icon associated with the setting.
 * @property {string} [label] - Optional display label for the setting.
 * @property {string[]} options - List of possible values for the setting.
 * @property {string} [defaultValue] - The default value for the setting.
 * @property {(value: string) => void} [callback] - Optional callback invoked when the setting value changes.
 */
export interface UserSettingConfig extends GenericType {
  enabled?: boolean;
  key: string;
  label: string;
  optionList: string[];
  defaultValue?: string;
  callback?: (value: string) => void;
}

/**
 * Options for configuring user settings in the application.
 *
 * @extends ConfigOptions
 *
 * @property enabled - Indicates whether user settings are enabled.
 * @property format - The display format for the settings UI. Can be 'accordion', 'card', or 'tabs'.
 * @property standardSettings - Standard user settings, which may include theme, color mode, and navbar options. Each is a partial {@link UserSettingConfig}.
 * @property customSettings - Optional custom user settings, where each key maps to a partial {@link UserSettingConfig}.
 */
export interface UserSettingsOptions extends ConfigOptions {
  enabled: boolean;
  format: 'accordion' | 'card' | 'tabs' | 'dropdown' | 'typeahead';
  standardSettings: Partial<{
    theme: Partial<UserSettingConfig>;
    colorMode: Partial<UserSettingConfig>;
    navbarColor: Partial<UserSettingConfig>;
  }>;
  customSettings?: {
    /** custom settings need to provide valid UserSettingConfig */
    [key: string]: UserSettingConfig;
  };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'default',
  colorMode: 'auto',
  navbarColor: 'default',
};

export const DEFAULT_USER_SETTINGS_OPTIONS: UserSettingsOptions = {
  enabled: true,
  format: 'dropdown',
  /** missing properties for standard settings are provided by defaults */
  standardSettings: {
    theme: {
      enabled: true,
      key: 'theme',
      icon: 'brilliance',
      label: 'Theme',
      optionList: ['default'],
      defaultValue: DEFAULT_USER_SETTINGS.theme,
    },
    colorMode: {
      enabled: true,
      key: 'colorMode',
      icon: 'circle-half',
      label: 'Color Mode',
      optionList: ['light', 'dark', 'auto'],
      defaultValue: DEFAULT_USER_SETTINGS.colorMode,
    },
    navbarColor: {
      enabled: true,
      key: 'navbarColor',
      icon: 'paint-bucket',
      label: 'Navbar Color',
      optionList: [
        'default',
        'primary',
        'secondary',
        'info',
        'success',
        'warning',
        'danger',
        'light',
        'dark',
      ],
      defaultValue: DEFAULT_USER_SETTINGS.navbarColor,
    },
  },
};
