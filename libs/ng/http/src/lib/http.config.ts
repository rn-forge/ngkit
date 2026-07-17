// external imports
import { InjectionToken, makeEnvironmentProviders } from '@angular/core';

// internal imports

// definitions
export interface RnForgeHttpConfig {
  apiBasePath?: string;
}

export const DEFAULT_RN_FORGE_HTTP_CONFIG: Partial<RnForgeHttpConfig> = {};

export const RN_FORGE_HTTP_CONFIG_TOKEN = new InjectionToken<RnForgeHttpConfig>(
  'RnForgeHttpConfig',
  {
    providedIn: 'root',
    factory: () => DEFAULT_RN_FORGE_HTTP_CONFIG as RnForgeHttpConfig,
  },
);

export const provideRnForgeHttpConfig = (config: RnForgeHttpConfig) => {
  return makeEnvironmentProviders([
    {
      provide: RN_FORGE_HTTP_CONFIG_TOKEN,
      useValue: { ...DEFAULT_RN_FORGE_HTTP_CONFIG, ...config },
    },
  ]);
};
