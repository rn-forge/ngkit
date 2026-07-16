// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  input,
  InputSignal,
  Signal,
  TemplateRef,
} from '@angular/core';

// internal imports
import { ConfigOptions, ConfigurableComponent } from '@rn-forge/ng-bootstrap';
import { BREAKPOINT } from '@rn-forge/ng-bootstrap';
import { Brand, BrandOptions } from '../header/brand/brand';
import { Navbar, NavbarOptions } from '../navbar/navbar';

/**
 * Footer component
 */
@Component({
  selector: 'rnf-footer',
  imports: [CommonModule, Brand, Navbar],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent extends ConfigurableComponent<FooterOptions> {
  /** Input properties **/
  template: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();

  /** ConfigurableComponent overrides **/
  override configKey = 'footer';

  override defaultOptions(): Partial<FooterOptions> {
    return {
      id: 'footerMenu',
      menuPosition: 'right',
    };
  }

  protected readonly containerClass: Signal<string> = computed(() => {
    const breakpoint = this.config.breakpoint;
    return [
      this.config.containerClass ?? '',
      breakpoint
        ? `flex-column flex-${breakpoint}-row pt-2 pt-${breakpoint}-0`
        : '',
    ]
      .join(' ')
      .trim();
  });

  protected readonly menuPositionClass: Signal<string> = computed(() => {
    const marginClass =
      this.config.menuPosition === 'left'
        ? 'e'
        : this.config.menuPosition === 'right'
          ? 's'
          : 'x';
    if (this.config.breakpoint) {
      return `mx-auto mx-${this.config.breakpoint}-0 m${marginClass}-${this.config.breakpoint}-auto`;
    }

    return `m${marginClass}-auto`;
  });
}

export interface FooterOptions extends ConfigOptions {
  id?: string;
  bgColor?: string;
  footerClass?: string;
  containerClass?: string;
  breakpoint?: BREAKPOINT;
  brand?: BrandOptions;
  copyright?: string;
  navbar?: NavbarOptions;
  menuPosition?: 'left' | 'right' | 'center';
}
