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
import { RouterLink } from '@angular/router';

// internal imports
import {
  GenericType,
  HtmlAttributesDirective,
  TemplateContext,
} from '@rn-forge/ng/core';
import { ConfigOptions, ConfigurableComponent } from '@rn-forge/ng-bootstrap';
import { BREAKPOINT } from '@rn-forge/ng-bootstrap';
import { ColorMode } from '../color-mode/color-mode';
import { Offcanvas, OffcanvasOptions } from '../offcanvas/offcanvas';
import {
  DIVIDER,
  NAV_ITEM_TYPE,
  NAV_LINK_TYPE,
  NavItem,
  NavLink,
  SubMenuItem,
} from './navbar.types';

/**
 * Pure renderer navbar.
 *
 * Renders items from NavbarOptions.items without any permission filtering.
 * Item filtering is the caller's responsibility — use computed() in the app component:
 *
 *   protected readonly navItems = computed(() =>
 *     this.allNavItems.filter(item =>
 *       !item.permission || this.hasPermission(item.permission)
 *     )
 *   );
 *
 * This keeps /shell free of auth imports (Decision 15).
 */
@Component({
  selector: 'rnf-navbar',
  imports: [
    CommonModule,
    RouterLink,
    HtmlAttributesDirective,
    Offcanvas,
    ColorMode,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar extends ConfigurableComponent<NavbarOptions> {
  override configKey = 'navbar';
  readonly template: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();
  readonly contextParams: InputSignal<GenericType> = input<GenericType>({});

  protected readonly offcanvasTarget: Signal<string | undefined> = computed(
    () =>
      this.config.offcanvas?.id ? `#${this.config.offcanvas.id}` : undefined,
  );
  protected readonly templateContext: Signal<TemplateContext> = computed(() => {
    return {
      $implicit: {
        config: this.config,
        offcanvasTarget: this.offcanvasTarget(),
        ...this.contextParams(),
      },
    };
  });

  override configureOptions(currentOptions: Partial<NavbarOptions>): void {
    if (currentOptions.offcanvas) {
      currentOptions.offcanvas.id ??= `${currentOptions.id}-offcanvas`;
    }

    if (currentOptions.items && currentOptions.useDivider) {
      currentOptions.items = currentOptions.items
        .flatMap((item) => [item, DIVIDER])
        .slice(0, -1);
    }
  }

  /**
   * Checks item type only — permission filtering is the caller's responsibility.
   */
  isNavEnabled(nav: NavItem | SubMenuItem, itemType: NAV_ITEM_TYPE): boolean {
    return nav.type === itemType;
  }

  getLinkContext(item: NavItem, submenuItem?: SubMenuItem): TemplateContext {
    return {
      $implicit: {
        item: submenuItem ?? item,
        offcanvasTarget: this.offcanvasTarget(),
        class: [
          submenuItem ? 'dropdown-item' : 'nav-link',
          (submenuItem ? item.submenu?.linkClass : this.config.linkClass) ?? '',
          (submenuItem ? submenuItem.class : item.class) ?? '',
        ]
          .join(' ')
          .trim(),
      },
    };
  }

  static customDivider(options: Partial<NavItem>): NavItem {
    return { ...DIVIDER, ...options };
  }
}

export interface NavbarOptions extends ConfigOptions {
  id?: string;
  type: 'header' | 'footer' | 'sidebar';
  breakpoint?: BREAKPOINT;
  offcanvas?: OffcanvasOptions;
  navClass?: string;
  menuClass?: string;
  itemClass?: string;
  linkClass?: string;
  items?: NavItem[];
  useDivider?: boolean;
}

export {
  DIVIDER,
  type NAV_ITEM_TYPE,
  type NAV_LINK_TYPE,
  type NavItem,
  type NavLink,
  type SubMenuItem,
};
