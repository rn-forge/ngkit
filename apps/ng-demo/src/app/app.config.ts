// external imports
import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

// internal imports
import { provideRnForgeCoreConfig } from '@rn-forge/ng/core';
import { provideRnForgeAuth } from '@rn-forge/ng/auth';
import { provideRnForgeBootstrapConfig } from '@rn-forge/ng-bootstrap';
import { provideRnForgeShellConfig } from '@rn-forge/ng-bootstrap/shell';

import { appRoutes } from './app.routes';
import { DEMO_API_URL } from './shared/api.tokens';
import { DemoErrorHandler } from './shared/global-error.handler';
import { mockApiInterceptor } from './shared/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([mockApiInterceptor])),

    provideRnForgeCoreConfig({
      appName: 'Demo App',
    }),

    provideRnForgeAuth(),

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
