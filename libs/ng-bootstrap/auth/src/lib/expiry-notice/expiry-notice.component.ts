// external imports
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

// internal imports
import { AuthService, RNF_CREDENTIALS } from '@rn-forge/ng/auth';

/** Dismissible session-expiry warning that offers sign-in at the current URL. */
@Component({
  selector: 'rnf-session-expiry-notice',
  standalone: true,
  templateUrl: './expiry-notice.component.html',
})
export class SessionExpiryNoticeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly credentials = inject(RNF_CREDENTIALS);
  protected readonly router = inject(Router);
  protected readonly dismissed = signal(false);

  constructor() {
    effect(() => {
      if (!this.auth.expiryWarning()) {
        this.dismissed.set(false);
      }
    });
  }
}
