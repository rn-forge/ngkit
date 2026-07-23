// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  EventEmitter,
  input,
  InputSignal,
  OnInit,
  Output,
  Signal,
} from '@angular/core';
import { isEmpty } from 'lodash-es';

// internal imports
import { HtmlAttributesDirective } from '@rn-forge/ng/core';
import { ConfigurableComponent } from '../bootstrap.component';
import { STYLE } from '../bootstrap.types';
import { ButtonOptions, ButtonType } from './button.types';

export const CLOSE_BUTTON: ButtonOptions = { type: 'close' };

/**
 * Bootstrap button with configurable type, variant, icon, and disabled state.
 *
 * Inputs can be set via the `[options]` bag or individually:
 *
 * ```html
 * <!-- Via individual inputs -->
 * <rnf-button class="primary" icon="plus-lg" label="Add" (buttonClick)="onAdd()" />
 * <rnf-button class="danger" outline icon="trash3" label="Delete" [disabled]="!selected" />
 * <rnf-button type="close" />
 *
 * <!-- Via options bag -->
 * <rnf-button [options]="{ class: 'success', label: 'Save', callback: onSave }" />
 * ```
 *
 * Available `class` values: Bootstrap contextual styles (`primary`, `secondary`, `success`,
 * `danger`, `warning`, `info`, `light`, `dark`).
 * Set `outline: true` to use the outline variant.
 * Set `type: 'close'` to render a `btn-close` element.
 */
@Component({
  selector: 'rnf-button',
  standalone: true,
  imports: [CommonModule, HtmlAttributesDirective],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent
  extends ConfigurableComponent<ButtonOptions>
  implements OnInit
{
  /** Input properties - direct setters as alternative to `options` **/
  type: InputSignal<ButtonType | undefined> = input<ButtonType>();
  class: InputSignal<STYLE | undefined> = input<STYLE>();
  outline: InputSignal<boolean | undefined> = input<boolean | undefined>(false);
  icon: InputSignal<string | undefined> = input<string | undefined>(undefined);
  label: InputSignal<string | undefined> = input<string | undefined>(undefined);
  additionalClasses: InputSignal<string | undefined> = input<string>();
  disabled: InputSignal<boolean> = input<boolean>(false);

  readonly isDisabled = computed(() => {
    if (this.config.disabled === undefined) {
      return false;
    }

    if (typeof this.config.disabled === 'function') {
      return (this.config.disabled as () => boolean)();
    }

    return !!this.config.disabled;
  });

  protected readonly buttonClass: Signal<string> = computed(() => {
    const outlinePrefix = this.config.outline ? 'outline-' : '';
    return [
      'btn',
      this.config.type === 'close' ? 'btn-close' : '',
      this.config.class ? `btn-${outlinePrefix}${this.config.class}` : '',
      this.config.additionalClasses ?? '',
    ]
      .join(' ')
      .trim();
  });

  /** Output events **/
  @Output() buttonClick = new EventEmitter();

  constructor() {
    super();
    effect(() => {
      if (isEmpty(this.options())) {
        this.updateOptions({
          type: this.type(),
          class: this.class(),
          label: this.label(),
          icon: this.icon(),
          outline: this.outline(),
          additionalClasses: this.additionalClasses(),
          disabled: () => this.disabled(),
        });
      }
    });
  }

  /** ConfigurableComponent overrides **/
  override configKey = 'button';

  override defaultOptions(): Partial<ButtonOptions> {
    return {
      type: 'button',
      outline: false,
      disabled: () => false,
    };
  }

  protected handleClick(): void {
    if (this.config.callback) {
      this.config.callback();
      return;
    }

    this.buttonClick.emit();
  }
}

// re-export for public API
export type { ButtonOptions, ButtonType } from './button.types';
