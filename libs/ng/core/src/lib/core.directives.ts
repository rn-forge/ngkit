import {
  Directive,
  ElementRef,
  Input,
  OnInit,
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
export class HtmlAttributesDirective implements OnInit {
  private readonly host: ElementRef = inject(ElementRef);
  private readonly renderer: Renderer2 = inject(Renderer2);

  /**
   * Map of attribute name → value pairs to set on the host element.
   * All entries are applied once on `ngOnInit`.
   */
  @Input() rnfHtmlAttributes!: Record<string, string>;

  ngOnInit(): void {
    Object.entries(this.rnfHtmlAttributes).forEach(([key, value]) => {
      this.renderer.setAttribute(this.host.nativeElement, key, value);
    });
  }
}
