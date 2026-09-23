import { InjectionToken } from '@angular/core';

/**
 * Base URL for the demo app's mock `/api` backend. One app-owned token per
 * backend — see `docs/plans/web-app-migration-plan.md` H2R.3.
 */
export const DEMO_API_URL = new InjectionToken<string>('DEMO_API_URL');
