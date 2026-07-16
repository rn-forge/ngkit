// external imports
import { InjectionToken, makeEnvironmentProviders } from '@angular/core';

// internal imports

// definitions
/**
 * Root configuration for the `@rn-forge/ng` library.
 * Provide it at application bootstrap via {@link provideRnForgeCoreConfig}.
 */
export interface RnForgeCoreConfig {
  /** Application name; used as the localStorage key namespace. */
  appName: string;
  /** Base URL for API calls (consumed by `@rn-forge/ng/http`). */
  apiBasePath?: string;
}

export const RN_FORGE_APP_CONFIG_TOKEN = new InjectionToken<RnForgeCoreConfig>(
  'RnForgeCoreConfig',
  {
    providedIn: 'root',
    factory: () => {
      throw new Error(
        '[rn-forge.ng] RnForgeCoreConfig is not configured. ' +
          'Call provideRnForgeCoreConfig({ appName: "..."}) in your application bootstrap.',
      );
    },
  },
);

/**
 * Registers {@link RnForgeCoreConfig} with Angular's DI system.
 * Call this in your application's `providers` array (or `appConfig`).
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideRnForgeCoreConfig({ appName: 'my-app', apiBasePath: '/api' })]
 * });
 * ```
 */
export const provideRnForgeCoreConfig = (config: RnForgeCoreConfig) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: config },
  ]);
};
