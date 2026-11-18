// external imports
import {
  Directive,
  ElementRef,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';

// internal imports
import { RNF_PERMISSION } from './auth.config';

/**
 * Conditionally renders a template based on a single permission key.
 * Renders at most one view.
 */
@Directive({
  selector: '[rnfHasPermission]',
})
export class HasPermissionDirective {
  readonly host: ElementRef = inject(ElementRef);
  private readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
  private readonly viewContainer: ViewContainerRef = inject(ViewContainerRef);
  private readonly permission = inject(RNF_PERMISSION);

  @Input() set rnfHasPermission(key: string) {
    if (this.permission.hasPermission(key)) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
      return;
    }

    this.viewContainer.clear();
  }
}

/**
 * Conditionally renders a template when the user holds at least one of the given permissions.
 * Renders at most one view.
 */
@Directive({
  selector: '[rnfHasAnyPermission]',
})
export class HasAnyPermissionDirective {
  readonly host: ElementRef = inject(ElementRef);
  private readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
  private readonly viewContainer: ViewContainerRef = inject(ViewContainerRef);
  private readonly permission = inject(RNF_PERMISSION);

  @Input() set rnfHasAnyPermission(keys: string[]) {
    if (this.permission.hasAnyPermission(...keys)) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
      return;
    }

    this.viewContainer.clear();
  }
}
