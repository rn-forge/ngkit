// external imports
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

// internal imports
import { RNF_AUTH_CONFIG_TOKEN } from '@rn-forge/ng/auth';
import { RouteService } from '@rn-forge/ng/core';
import { ConfigOptions } from '@rn-forge/ng-bootstrap';
import { AbstractAuthPage } from '../abstract-auth-page';

const ERROR_MESSAGES = new Map<string, string>([
  [
    'access_denied',
    'Sign-in was cancelled or refused by the identity provider.',
  ],
  [
    'account_not_provisioned',
    'You signed in, but this application has no account for you. Contact your administrator.',
  ],
  ['login_failed', 'Sign-in could not be completed. Please try again.'],
  [
    'session_not_established',
    'Sign-in completed, but no session was established. Check that this site may set cookies, then try again.',
  ],
]);

/** Auth error page displaying a known failure message and a link back to login. */
@Component({
  selector: 'rnf-auth-error',
  imports: [RouterLink],
  templateUrl: './auth-error.component.html',
})
export class AuthErrorComponent extends AbstractAuthPage<ConfigOptions> {
  private readonly route = inject(RouteService);
  readonly loginPath = inject(RNF_AUTH_CONFIG_TOKEN).loginPath;
  override configKey = 'authError';

  get message(): string {
    return (
      ERROR_MESSAGES.get(this.route.queryParams['error']) ??
      'Sign-in failed for an unknown reason. Please try again.'
    );
  }
}
