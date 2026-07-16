// external imports
import { CdkDragStart, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  input,
  InputSignal,
  signal,
  WritableSignal,
} from '@angular/core';

// internal imports
import { GenericType } from '@rn-forge/ng/core';
import { startCase } from 'lodash-es';
import { ConfigOptions, ConfigurableComponent } from '@rn-forge/ng-bootstrap';
import { StyleHelper } from '@rn-forge/ng-bootstrap';
import { SubMenu } from '../navbar/navbar.types';
import { UserSettingsService } from '@rn-forge/ng-bootstrap/auth';

// global variables
export type COLOR_MODE = 'light' | 'dark' | 'auto';
type VIEW_MODE = 'button' | 'menu'; // | 'link';
export const COLOR_MODE_ICON_MAP: GenericType<string> = {
  light: 'sun-fill',
  dark: 'moon-stars-fill',
  auto: 'circle-half',
};

@Component({
  selector: 'rnf-color-mode',
  imports: [CommonModule, DragDropModule],
  templateUrl: './color-mode.html',
  styleUrl: './color-mode.scss',
})
export class ColorMode extends ConfigurableComponent<ColorModeOptions> {
  mode: InputSignal<VIEW_MODE> = input<VIEW_MODE>('button');

  private userSettingsService: UserSettingsService =
    inject(UserSettingsService);
  private styleHelper: StyleHelper = inject(StyleHelper);
  private dragging = false;

  protected activeMode: WritableSignal<COLOR_MODE> = signal<COLOR_MODE>('auto');
  protected activeModeLabel: WritableSignal<string> = signal<string>('');
  protected activeModeIcon: WritableSignal<string> = signal<string>('');

  override delayedAfterViewInit(): void {
    super.delayedAfterViewInit();

    const stored = this.userSettingsService.currentUserSettings['colorMode'] as
      COLOR_MODE | undefined;
    if (stored) {
      this.setColorMode(stored);
    }

    this.userSettingsService.registerChangeListener(
      'colorMode',
      (colorMode: string) => {
        if (!colorMode) return;
        this.setColorMode(colorMode as COLOR_MODE);
      },
    );
  }

  /** ConfigurableComponent overrides **/
  override configKey = 'colorMode';

  override defaultOptions(): Partial<ColorModeOptions> {
    return {
      buttonClass: 'btn-warning',
    };
  }

  /** Component methods */
  protected setColorMode(colorMode: COLOR_MODE) {
    // update the active mode, icon and text
    this.activeMode.set(colorMode);
    this.activeModeLabel.set(`Toggle theme (${startCase(colorMode)})`);
    this.activeModeIcon.set(`#${COLOR_MODE_ICON_MAP[colorMode]}`);

    this.styleHelper.setColorMode(colorMode);
    // this.showActiveMode(colorMode);
  }

  protected updateColorMode(colorMode: COLOR_MODE) {
    this.userSettingsService.updateSetting('colorMode', colorMode);
    this.setColorMode(colorMode);
  }

  protected handleDrag(event: CdkDragStart): void {
    this.dragging = event.source !== null;
  }

  protected handleClick(event: MouseEvent): boolean {
    if (this.dragging) {
      this.dragging = false;
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    return true;
  }
}

export interface ColorModeOptions extends ConfigOptions {
  class?: string;
  buttonClass?: string;
  menuClass?: string;
  menu?: Omit<SubMenu, 'items'>;
}
