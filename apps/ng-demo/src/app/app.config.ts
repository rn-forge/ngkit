import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideRnForgeCoreConfig } from '@rn-forge/ng/core';
import {
  authHttpInterceptor,
  provideRnForgeAuthConfig,
} from '@rn-forge/ng/auth';
import { provideRnForgeBootstrapConfig } from '@rn-forge/ng-bootstrap';
import { provideRnForgeShellConfig } from '@rn-forge/ng-bootstrap/shell';

// internal imports
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { DEMO_API_URL } from './shared/api.tokens';
import { DemoErrorHandler } from './shared/global-error.handler';
import { mockApiInterceptor } from './shared/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(
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
        baseUrl: '/api',
        // The fixture backend has no auth; the demo's anonymous credentials
        // would otherwise redirect every unmocked call to login.
        ignoreBackendURLs: environment.mockProducts
          ? ['/api/auth/']
          : ['/api/'],
      },
    }),

    { provide: DEMO_API_URL, useValue: '/api' },

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
