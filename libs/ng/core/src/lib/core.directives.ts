import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  Renderer2,
  inject,
} from '@angular/core';

/**
 * Directive that applies a map of HTML attributes to the host element at runtime.
 *
 * Useful when a component needs to forward arbitrary attributes (e.g. ARIA roles,
 * `data-*` attributes, or accessibility props) received as a plain object rather
 * than binding each attribute individually in the template.
 *
 * @example
 * ```html
 * <button [rnfHtmlAttributes]="{ 'aria-label': 'Close', 'data-id': '42' }">X</button>
 * ```
 */
@Directive({
  selector: '[rnfHtmlAttributes]',
  standalone: true,
})
export class HtmlAttributesDirective implements OnChanges {
  private readonly host: ElementRef = inject(ElementRef);
  private readonly renderer: Renderer2 = inject(Renderer2);

  private applied = new Set<string>();

  /**
   * Map of attribute name → value pairs to set on the host element. Re-applied
   * whenever the bound map changes; attributes absent from the next map are removed.
   */
  @Input() rnfHtmlAttributes?: Record<string, string> | null;

  ngOnChanges(): void {
    const next = this.rnfHtmlAttributes ?? {};
    const el = this.host.nativeElement;

    this.applied.forEach((key) => {
      if (!(key in next)) {
        this.renderer.removeAttribute(el, key);
      }
    });

    this.applied = new Set(Object.keys(next));
    Object.entries(next).forEach(([key, value]) => {
      this.renderer.setAttribute(el, key, value);
    });
  }
}
