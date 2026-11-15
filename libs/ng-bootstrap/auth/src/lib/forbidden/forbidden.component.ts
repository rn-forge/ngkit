// external imports
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// internal imports
import { ConfigOptions } from '@rn-forge/ng-bootstrap';
import { AbstractAuthPage } from '../abstract-auth-page';

/** Permission-denied page offering a return home without restarting login. */
@Component({
  selector: 'rnf-forbidden',
  imports: [RouterLink],
  templateUrl: './forbidden.component.html',
})
export class ForbiddenComponent extends AbstractAuthPage<ConfigOptions> {
  override configKey = 'forbidden';
}
