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
 */
@Directive({
  selector: '[rnfHasPermission]',
})
export class HasPermissionDirective {
  host: ElementRef = inject(ElementRef);
  private templateRef: TemplateRef<unknown> = inject(TemplateRef);
  private viewContainer: ViewContainerRef = inject(ViewContainerRef);
  private permission = inject(RNF_PERMISSION);

  @Input() set rnfHasPermission(key: string) {
    if (this.permission.hasPermission(key)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      return;
    }

    this.viewContainer.clear();
  }
}

/**
 * Conditionally renders a template when the user holds at least one of the given permissions.
 */
@Directive({
  selector: '[rnfHasAnyPermission]',
})
export class HasAnyPermissionDirective {
  host: ElementRef = inject(ElementRef);
  private templateRef: TemplateRef<unknown> = inject(TemplateRef);
  private viewContainer: ViewContainerRef = inject(ViewContainerRef);
  private permission = inject(RNF_PERMISSION);

  @Input() set rnfHasAnyPermission(keys: string[]) {
    if (this.permission.hasAnyPermission(...keys)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      return;
    }

    this.viewContainer.clear();
  }
}
