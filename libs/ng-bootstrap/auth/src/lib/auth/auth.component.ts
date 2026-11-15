// external imports
import { Component, inject } from '@angular/core';

// internal imports
import { RouteService } from '@rn-forge/ng/core';
import { AlertComponent, ConfigOptions } from '@rn-forge/ng-bootstrap';
import { AbstractAuthPage } from '../abstract-auth-page';

/** Configuration options for the interim session login page. */
export type AuthOptions = ConfigOptions;

@Component({
  selector: 'rnf-auth',
  imports: [AlertComponent],
  templateUrl: './auth.component.html',
})
export class AuthComponent extends AbstractAuthPage<AuthOptions> {
  private readonly routeService = inject(RouteService);

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    if (this.isAuthenticated) {
      this.routeService.navigateByUrl(
        this.routeService.queryParams['returnTo'] || '/',
      );
    }
  }

  override configKey = 'auth';
}
