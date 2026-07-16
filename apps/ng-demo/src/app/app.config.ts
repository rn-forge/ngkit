import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideRnForgeCoreConfig } from '@rn-forge/ng/core';
import {
  authHttpInterceptor,
  provideRnForgeAuthConfig,
} from '@rn-forge/ng/auth';
import { provideRnForgeBootstrapConfig } from '@rn-forge/ng-bootstrap';
import { provideRnForgeShellConfig } from '@rn-forge/ng-bootstrap/shell';
import { provideRnForgeHttpConfig } from '@rn-forge/ng/http';

// internal imports
import { appRoutes } from './app.routes';
import { DemoErrorHandler } from './shared/global-error.handler';
import { mockApiInterceptor } from './shared/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([mockApiInterceptor, authHttpInterceptor()]),
    ),

    provideRnForgeCoreConfig({
      appName: 'Demo App',
    }),

    provideRnForgeAuthConfig({
      frontend: {
        loginPath: '/auth',
        ignoreAppRoutes: ['/auth'],
      },
      backend: {
        ignoreBackendURLs: ['/api/auth/'],
      },
    }),

    provideRnForgeHttpConfig({
      apiBasePath: '/api',
    }),

    provideRnForgeBootstrapConfig({
      table: {
        minWidth: 700,
        treegrid: true,
      },
    }),
    provideRnForgeShellConfig({}),

    { provide: ErrorHandler, useClass: DemoErrorHandler },
  ],
};
