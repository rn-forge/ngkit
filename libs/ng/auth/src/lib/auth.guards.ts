// external imports
import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';

// internal imports
import {
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RNF_PERMISSION,
} from './auth.config';

/** Redirect anonymous users to login and enforce a route permission when present. */
export const authRouteGuard: CanActivateChildFn = (route, state) => {
  const config = inject(RNF_AUTH_CONFIG_TOKEN);
  const credentials = inject(RNF_CREDENTIALS);
  const permission = inject(RNF_PERMISSION);
  const router = inject(Router);
  if (!credentials().isAuthenticated) {
    return router.createUrlTree([config.loginPath], {
      queryParams: { returnTo: state.url },
    });
  }
  const key = route.data?.['permission'];
  return !key || permission.hasPermission(key);
};
