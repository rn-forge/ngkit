// external imports
import { inject } from '@angular/core';

// internal imports
import { AbstractConstructor } from '@rn-forge/ng/core';
import { AuthService } from './auth.services';
import { UserProfile } from './auth.types';

export interface AuthComponentMixin {
  readonly authService: AuthService;
  readonly userProfile: UserProfile;
  readonly isAuthenticated: boolean;
  userHasPermission(permission: string): boolean;
  userHasAnyPermission(...permissions: string[]): boolean;
}

/**
 * Mixin to provide access to AuthService and its methods within a component.
 * Return type is cast to `$C & AbstractConstructor<AuthComponentMixin>` so that
 * the base class's generic parameters (e.g. ConfigurableComponent<$O>) are
 * preserved through the mixin chain and don't collapse to `object`.
 */
export function authComponentMixin<$C extends AbstractConstructor>(
  BaseClass: $C,
) {
  abstract class AuthenticatedBaseComponent extends BaseClass {
    public readonly authService: AuthService = inject(AuthService);

    get userProfile(): UserProfile {
      return (this.authService.userProfile || {}) as UserProfile;
    }

    get isAuthenticated(): boolean {
      return this.authService.isAuthenticated;
    }

    userHasPermission(permission: string): boolean {
      return this.authService.hasPermission(permission);
    }

    userHasAnyPermission(...permissions: string[]): boolean {
      return this.authService.hasAnyPermission(...permissions);
    }
  }

  return AuthenticatedBaseComponent as unknown as $C &
    AbstractConstructor<AuthComponentMixin>;
}
