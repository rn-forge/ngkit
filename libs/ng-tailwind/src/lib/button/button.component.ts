import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
} from '@angular/core';

export type RnfButtonVariant =
  'secondary' | 'primary' | 'accent' | 'ghost' | 'danger';
export type RnfButtonShape = 'default' | 'pill';
export type RnfButtonSize = 'md' | 'sm';

/**
 * A native `<button>` or `<a>` styled from the `--rnf-*` tokens. The host keeps its tag, its
 * `type` and any `routerLink`. A disabled or busy button gets the native `disabled` attribute;
 * a disabled or busy anchor gets `aria-disabled`, leaves the tab order and swallows clicks.
 */
@Component({
  // An attribute selector on native elements, so the element-selector rule does not apply.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[rnfButton], a[rnfButton]',
  host: {
    class: 'rnf-button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-shape]': 'shape()',
    '[attr.data-size]': 'size()',
    '[attr.aria-busy]': 'busy() || null',
    '[attr.aria-disabled]': 'isAnchor && inactive() || null',
    '[attr.disabled]': '!isAnchor && inactive() || null',
    '[attr.tabindex]': 'isAnchor && inactive() ? -1 : null',
  },
  template: '<ng-content />',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RnfButton {
  readonly variant = input<RnfButtonVariant>('secondary');
  readonly shape = input<RnfButtonShape>('default');
  readonly size = input<RnfButtonSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly isAnchor = this.element.tagName === 'A';
  protected readonly inactive = computed(() => this.disabled() || this.busy());

  constructor() {
    // Capture phase on the host itself runs before the bubble-phase listeners of RouterLink
    // and of a template `(click)` on the same element.
    const swallow = (event: Event): void => {
      if (this.isAnchor && this.inactive()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    this.element.addEventListener('click', swallow, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      this.element.removeEventListener('click', swallow, { capture: true }),
    );
  }
}
