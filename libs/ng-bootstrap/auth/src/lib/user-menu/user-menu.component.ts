// external imports
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

// internal imports
import { AuthService, RNF_CREDENTIALS } from '@rn-forge/ng/auth';

/** Signed-in session menu with optional profile and settings links. */
@Component({
  selector: 'rnf-user-menu',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-menu.component.html',
})
export class UserMenuComponent {
  /** Router link for the Profile item; the item is hidden when unset. */
  readonly profileUrl = input<string | undefined>();
  /** Router link for the Settings item; the item is hidden when unset. */
  readonly settingsUrl = input<string | undefined>();

  protected readonly auth = inject(AuthService);
  protected readonly credentials = inject(RNF_CREDENTIALS);
}
