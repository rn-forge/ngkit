import { InjectionToken } from '@angular/core';

/**
 * Base URL for the demo app's mock `/api` backend. One app-owned token per
 * backend — see `docs/guides/http.md`.
 */
export const DEMO_API_URL = new InjectionToken<string>('DEMO_API_URL');
