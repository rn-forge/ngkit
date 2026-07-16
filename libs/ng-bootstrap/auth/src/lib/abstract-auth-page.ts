// external imports
import { Component, inject } from '@angular/core';

// internal imports — auth tokens from ng-auth (only this file pulls in auth)
import {
  RNF_CREDENTIALS,
  RNF_PERMISSION,
  UserProfile,
} from '@rn-forge/ng/auth';

import { AbstractPage, ConfigOptions } from '@rn-forge/ng-bootstrap';

/**
 * Auth-aware base class for full-page components that need identity/permission access.
 *
 * Extends AbstractPage with auth accessors by injecting RNF_PERMISSION and
 * RNF_CREDENTIALS. Only components extending this class pull in @rn-forge/ng/auth —
 * tree-shaking removes auth for apps that only use AbstractPage.
 *
 * Decision 17: opt-in auth via separate class keeps root EP auth-free.
 */
@Component({
  template: '',
})
export abstract class AbstractAuthPage<
  $O extends ConfigOptions = ConfigOptions,
> extends AbstractPage<$O> {
  private readonly _permission = inject(RNF_PERMISSION);
  private readonly _credentials = inject(RNF_CREDENTIALS);

  get isAuthenticated(): boolean {
    return this._credentials().isAuthenticated;
  }

  get userProfile(): UserProfile {
    return this._credentials().userProfile() as UserProfile;
  }

  hasPermission(key: string): boolean {
    return this._permission.hasPermission(key);
  }

  hasAnyPermission(...keys: string[]): boolean {
    return this._permission.hasAnyPermission(...keys);
  }
}
