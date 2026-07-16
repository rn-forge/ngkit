import { GenericType } from '@rn-forge/ng/core';

export type NAV_LINK_TYPE = 'link' | 'url' | 'callback';
export type NAV_ITEM_TYPE =
  NAV_LINK_TYPE | 'submenu' | 'color-mode' | 'divider';
export type SUBMENU_TYPE = 'dropdown' | 'dropup';
export type SUBMENU_ITEM_TYPE = NAV_LINK_TYPE | 'divider';

// Nav Types
/** provides attributes to configure the <a> tag for each nav link */
export interface NavLink {
  icon?: string;
  img?: {
    class?: string;
    src: string;
  };
  label?: string;
  href?: string;
  queryParams?: GenericType; // for 'link' type links
  target?: '_blank' | '_self' | '_parent' | '_top'; // for 'url' type links
  class?: string; // class for the <a> tag
  callback?: () => void;
}

/** each instance represents one <li> tag in the submenu */
export interface SubMenuItem extends NavLink {
  type: SUBMENU_ITEM_TYPE;
  permission?: string;
  itemClass?: string; // class for the <li> tag
}

/** each instance represents the <ul> tag for the submenu */
export interface SubMenu {
  type: SUBMENU_TYPE;
  class?: string; // class for the submenu <ul> tag
  itemClass?: string; // class for the <li> tag inside the submenu; shortcut to avoid repetition in each item
  linkClass?: string; // class for each <a> tag inside the submenu; shortcut to avoid repetition in each item
  items?: SubMenuItem[];
}

/** each instance represents one <li> tag in the <ul> under <nav> */
export interface NavItem extends NavLink {
  type: NAV_ITEM_TYPE;
  permission?: string;
  itemClass?: string; // class for the <li> tag
  submenu?: SubMenu;
}

// export interface NavItem extends NavLink {
//   type: NAV_ITEM_TYPE;
//   itemClass?: string; // class for the <li> tag
//   submenuType?: 'dropdown' | 'dropup';
//   submenuClass?: string; // class for the dropdown-menu <ul> tag
//   submenuItemClass?: string; // class for each <li> tag inside submenu
//   submenu?: SubMenuItem[];
// }

export const DIVIDER: NavItem = { type: 'divider' };
