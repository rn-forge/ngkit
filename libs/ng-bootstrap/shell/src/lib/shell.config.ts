import { makeEnvironmentProviders } from '@angular/core';
import { RN_FORGE_BOOTSTRAP_CONFIG_PARTS } from '@rn-forge/ng-bootstrap';

import type { ColorModeOptions } from './color-mode/color-mode';
import type { FooterOptions } from './footer/footer.component';
import type { HeaderOptions } from './header/header.component';
import type { NavbarOptions } from './navbar/navbar';
import type { OffcanvasOptions } from './offcanvas/offcanvas';

/**
 * Configuration for shell EP components.
 * Keys match each component's `configKey`.
 */
export interface ShellConfig {
  colorMode?: Partial<ColorModeOptions>;
  footer?: Partial<FooterOptions>;
  header?: Partial<HeaderOptions>;
  navbar?: Partial<NavbarOptions>;
  offcanvas?: Partial<OffcanvasOptions>;
}

/**
 * Provides configuration for shell EP components
 * (header, footer, navbar, offcanvas, color-mode).
 */
export const provideRnForgeShellConfig = (config: ShellConfig) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_BOOTSTRAP_CONFIG_PARTS, useValue: config, multi: true },
  ]);
};
