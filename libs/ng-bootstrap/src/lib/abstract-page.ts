// external imports
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';

// internal imports
import { AlertComponent } from './alert/alert.component';
import { ConfigOptions, ConfigurableComponent } from './bootstrap.component';

/**
 * Auth-free base class for full-page components.
 *
 * Extends ConfigurableComponent with AlertComponent wiring and standard error handling.
 * Zero auth imports — apps that don't use auth extend this and never pull in @rn-forge/ng/auth.
 *
 * For auth-aware pages, use AbstractAuthPage from @rn-forge/ng-bootstrap/auth.
 */
@Component({
  template: '',
})
export abstract class AbstractPage<
  $O extends ConfigOptions = ConfigOptions,
> extends ConfigurableComponent<$O> {
  @ViewChild(AlertComponent) alert?: AlertComponent;

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    if (this.DEBUG) {
      this.alert?.warning(JSON.stringify(this.config));
    }
  }

  override handleErrorResponse(
    response: HttpErrorResponse,
    message?: string,
  ): void {
    const msg =
      (message ?? response.error?.message) + ` [${response.error?.error}]`;
    if (this.alert) {
      this.alert.error(msg);
    } else {
      console.error(msg);
    }
  }
}
