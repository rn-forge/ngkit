// external imports
import { inject } from '@angular/core';
import { CanActivateChildFn } from '@angular/router';

// internal imports
import { isDebugMode } from '@rn-forge/ng/core';
import {
  AuthFrontendConfig,
  RNF_AUTH_CONFIG_TOKEN,
  RNF_PERMISSION,
} from './auth.config';
import { AuthService } from './auth.services';

export const authRouteGuard: CanActivateChildFn = (route, state) => {
  const config: AuthFrontendConfig | undefined = inject(
    RNF_AUTH_CONFIG_TOKEN,
  ).frontend;
  const authService = inject(AuthService);
  const permissionService = inject(RNF_PERMISSION);

  if (isDebugMode())
    console.debug('rn-forge.ng.auth.routeGuard: %O | %O', route, state);

  for (const pattern of config?.ignoreAppRoutes ?? []) {
    if (state.url.includes(pattern)) {
      if (isDebugMode()) {
        console.debug(
          'rn-forge.ng.auth.routeGuard: ignoring auth URL | %s',
          state.url,
        );
      }
      return true;
    }
  }

  if (!authService.isAuthenticated) {
    if (isDebugMode()) {
      console.warn(
        'rn-forge.ng.auth.routeGuard: user not authenticated, redirecting | %s',
        state.url,
      );
    }
    authService.sendToLogin(state.url);
    return false;
  }

  const routePermission = (route.data ?? {})['permission'];
  if (routePermission && !permissionService.hasPermission(routePermission)) {
    if (isDebugMode()) {
      console.warn(
        'rn-forge.ng.auth.routeGuard: missing permission %s | %s',
        routePermission,
        state.url,
      );
    }
    return false;
  }

  return true;
};
