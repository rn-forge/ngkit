// external imports
import { inject } from '@angular/core';

// internal imports
import { AbstractConstructor } from '@rn-forge/ng/core';
import { RNF_CREDENTIALS, RNF_PERMISSION } from './auth.config';
import { Session } from './auth.types';

/** Component access to the current session, authentication state and permission policy. */
export interface AuthComponentMixin {
  readonly session: Session | null;
  readonly isAuthenticated: boolean;
  userHasPermission(permission: string): boolean;
  userHasAnyPermission(...permissions: string[]): boolean;
}

/** Preserve the base class's generic parameters through the mixin chain. */
export function authComponentMixin<$C extends AbstractConstructor>(
  BaseClass: $C,
) {
  abstract class AuthenticatedBaseComponent extends BaseClass {
    private readonly credentials = inject(RNF_CREDENTIALS);
    private readonly permission = inject(RNF_PERMISSION);
    get session(): Session | null {
      return this.credentials().session;
    }
    get isAuthenticated(): boolean {
      return this.credentials().isAuthenticated;
    }
    userHasPermission(permission: string): boolean {
      return this.permission.hasPermission(permission);
    }
    userHasAnyPermission(...permissions: string[]): boolean {
      return this.permission.hasAnyPermission(...permissions);
    }
  }
  return AuthenticatedBaseComponent as unknown as $C &
    AbstractConstructor<AuthComponentMixin>;
}
