// external imports
import { CommonModule } from '@angular/common';
import { Component, input, InputSignal, TemplateRef } from '@angular/core';
import type { Offcanvas as BootstrapOffcanvas } from 'bootstrap';

// internal imports
import { GenericType } from '@rn-forge/ng/core';
import {
  ButtonComponent,
  ButtonOptions,
  ConfigOptions,
  ConfigurableComponent,
  STYLE,
} from '@rn-forge/ng-bootstrap';

@Component({
  selector: 'rnf-offcanvas',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './offcanvas.html',
})
export class Offcanvas extends ConfigurableComponent<OffcanvasOptions> {
  readonly template: InputSignal<TemplateRef<unknown>> = input.required();
  readonly context: InputSignal<GenericType> = input<GenericType>({});

  // override ngAfterViewInit(): void {
  //   $('#' + this.config.id).on('hidden.bs.offcanvas', event => {
  //     console.warn(event);
  //     $(this.getTogglerButtonId(this.config)).trigger('blur');
  //   });
  //   $('#' + this.getTogglerButtonId(this.config)).on('blur', event => {
  //     console.warn(event);
  //     $('body').trigger('click');
  //   });
  // }

  /**
   * ConfigurableComponent overrides
   */
  override configKey = 'offcanvas';
  override defaultOptions(): Partial<OffcanvasOptions> {
    return {
      toggler: {
        class: 'border border-0',
      },
    };
  }
  override configureOptions(currentOptions: Partial<OffcanvasOptions>): void {
    if (currentOptions.toggler?.button) {
      currentOptions.toggler.button.id =
        this.getTogglerButtonId(currentOptions);
      currentOptions.toggler.button.additionalClasses =
        (currentOptions.toggler.button.additionalClasses ?? '') +
        ' navbar-toggler';
      currentOptions.toggler.button.callback = () => {
        return;
      };
    }
  }

  /**
   * Offcanvas members
   */
  protected getTogglerButtonId(_config: Partial<OffcanvasOptions>): string {
    return _config.toggler?.button?.id ?? `${_config.id}-toggler`;
  }

  protected getTogglerClass(): string {
    let directionClass = '';
    if (this.config.direction === 'start') {
      directionClass = 'me-auto';
    } else if (this.config.direction === 'end') {
      directionClass = 'ms-auto';
    }

    return [
      this.config.toggler?.class ?? '',
      this.config.toggler?.color ? 'text-' + this.config.toggler.color : '',
      directionClass,
    ]
      .join(' ')
      .trim();
  }
}

/**
 * Offcanvas options interface
 */
export interface OffcanvasOptions extends ConfigOptions {
  id?: string;
  // breakpoint?: BREAKPOINT;
  direction: 'start' | 'end' | 'top' | 'bottom';
  class?: string;
  bootstrap?: BootstrapOffcanvas.Options;
  toggler?: {
    color?: STYLE;
    class?: string;
    icon?: string;
    button?: ButtonOptions;
  };
  header?: {
    class?: string;
    title: string;
    titleClass?: string;
    closeBtn?: {
      options?: ButtonOptions;
      class?: string;
    };
  };
  body?: {
    class?: string;
  };
}
