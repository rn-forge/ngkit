// external imports
import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

// internal imports
import {
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RNF_PERMISSION,
} from './auth.config';
import { AuthService } from './auth.services';

/** Allow signed-in users, starting login for anonymous users. */
export const authGuard: CanActivateFn & CanActivateChildFn = (
  _route,
  state,
) => {
  const credentials = inject(RNF_CREDENTIALS);
  if (!credentials().isAuthenticated) {
    inject(AuthService).startLogin(state.url);
    return false;
  }
  return true;
};

/** Require every permission key, starting login or routing denied users to forbidden. */
export function permissionGuard(
  ...keys: string[]
): CanActivateFn & CanActivateChildFn {
  if (keys.length === 0)
    throw new Error(
      '[rn-forge.ng.auth] permissionGuard requires at least one key',
    );
  return (route, state) => {
    if (!authGuard(route, state)) return false;
    const permission = inject(RNF_PERMISSION);
    return keys.every((key) => permission.hasPermission(key))
      ? true
      : inject(Router).createUrlTree([
          inject(RNF_AUTH_CONFIG_TOKEN).forbiddenPath,
        ]);
  };
}
