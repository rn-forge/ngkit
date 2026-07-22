// external imports
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { isDebugMode } from '@rn-forge/ng/core';

// internal imports
import { RN_FORGE_BOOTSTRAP_CONFIG_TOKEN } from './bootstrap.config';

// global variables
const THEME_CSS_LINK_ID = 'themeCssLink';

@Injectable({
  providedIn: 'root',
})
export class StyleHelper {
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(RN_FORGE_BOOTSTRAP_CONFIG_TOKEN);

  private get themePath(): string {
    return (
      (this.config['themePath'] as string | undefined) ?? 'assets/styles/themes'
    );
  }

  listenToColorModeChanges(colorMode: string) {
    this.document.defaultView
      ?.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (colorMode === 'auto') {
          if (isDebugMode())
            console.warn('StyleHelper: System colorMode changed');
          this.setColorMode(colorMode);
        }
      });
  }

  setTheme(theme: string) {
    if (isDebugMode()) console.info('StyleHelper.setTheme:', theme);
    const existingLink = this.document.getElementById(
      THEME_CSS_LINK_ID,
    ) as HTMLLinkElement | null;
    const cssHref = `${this.themePath}/${theme}/bootstrap.css`;

    if (theme === 'default') {
      existingLink?.remove();
    } else if (!existingLink) {
      const link = this.document.createElement('link');
      link.id = THEME_CSS_LINK_ID;
      link.rel = 'stylesheet';
      link.href = cssHref;
      this.document.head.appendChild(link);
    } else {
      existingLink.href = cssHref;
    }
  }

  setColorMode(colorMode: string) {
    const effective =
      colorMode === 'auto' &&
      this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : colorMode;
    this.document.documentElement.dataset['bsTheme'] = effective;
  }

  toggleColorMode(colorMode: string): string {
    return colorMode === 'light' ? 'dark' : 'light';
  }

  colorModeIcon(colorMode: string): string {
    const map: Record<string, string> = {
      light: 'sun-fill',
      dark: 'moon-stars-fill',
      auto: 'circle-half',
    };
    return map[colorMode] ?? '';
  }
}
