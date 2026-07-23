// external imports
import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, Signal } from '@angular/core';

// internal imports
import { ConfigurableComponent } from '../bootstrap.component';
import { ErrorOptions } from './error.types';

// re-export for public API
export type { ErrorOptions } from './error.types';

/**
 * Full-page error display with standard HTTP error codes and configurable support/home links.
 *
 * ```html
 * <!-- 404 page -->
 * <rnf-error [options]="{ code: 404 }" />
 *
 * <!-- Custom message with a support link -->
 * <rnf-error [options]="{ code: 403, message: 'You need admin rights.', support: { label: 'Contact IT', url: '/support' } }" />
 * ```
 *
 * Supported codes: `401`, `403`, `404`, `500`. Any other code falls back to a generic message.
 */
@Component({
  selector: 'rnf-error',
  imports: [CommonModule],
  templateUrl: './error.component.html',
})
export class ErrorComponent
  extends ConfigurableComponent<ErrorOptions>
  implements OnInit
{
  override configKey = 'error';

  protected message: Signal<string> = computed(() =>
    this.getMessage(this.config),
  );

  private getMessage(config: Partial<ErrorOptions>): string {
    switch (config.code) {
      case 404:
        config.message ??= 'Page not found';
        break;
      case 403:
        config.message ??= 'Access denied';
        break;
      case 500:
        config.message ??= 'Internal server error';
        break;
      case 401:
        config.message ??= 'Unauthorized';
        break;
      default:
        config.message ??= 'An unknown error occurred';
    }
    return config.message;
  }

  override defaultOptions(): Partial<ErrorOptions> {
    return {
      code: 404,
      support: { label: 'Contact Support', url: 'javascript:void(0);' },
      home: { label: 'Home', url: '/' },
    };
  }
}
